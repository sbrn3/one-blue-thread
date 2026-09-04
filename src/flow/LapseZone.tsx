import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Cue } from '../cue';
import type { LadderResponse, Signature } from '../lab/ladder';
import { BookPicker } from '../ui/BookPicker';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { CueEditor } from '../knot/CueEditor';

interface LapseZoneProps {
  response: LadderResponse;
  partnerName: string | null;
  cue: Cue | null;
  currentBookId: string;
  onSaveCue: (c: Cue) => void;
  onExitBook: (bookId: string) => void;
  onPause: () => void;
  onKeepNudging: () => void;
  onHandoff: () => void;
  onDismiss: () => void;
}

const ONE_QUESTION_COPY: Partial<Record<Signature, string>> = {
  cue_collapse: "You used to read at the same point in your day; lately it's drifted, or stopped. Has something changed?",
  book_fatigue: "This book's been a slog lately, even though reading was going fine before it. Permission to stop here — that's allowed.",
  dose_too_high: "You've been opening the app without finishing the reading. Today's ask just got smaller — no need to catch up.",
  life_disruption: "It's been quiet. No pressure — just checking in, once.",
  drift: 'A few days have slipped by. Nothing broken, just noting it.',
};

/**
 * §11/§12 — the lapse ladder's user-facing tiers (one_question,
 * offramp, dormant). Rendered ungated by sealedToday — unlike a
 * report, this exists precisely because today may not get sealed.
 * Silent tiers ('none', 'reduce_dose') and the mechanic_friction
 * route never reach this component (see lapse.ts).
 */
export function LapseZone({
  response,
  partnerName,
  cue,
  currentBookId,
  onSaveCue,
  onExitBook,
  onPause,
  onKeepNudging,
  onHandoff,
  onDismiss,
}: LapseZoneProps) {
  const [renegotiatingCue, setRenegotiatingCue] = useState(false);
  const [pickingBook, setPickingBook] = useState<string | null>(null);

  if (response.action === 'one_question') {
    if (response.route === 'cue_collapse') {
      return (
        <View style={styles.zone}>
          <Text style={styles.prompt}>{ONE_QUESTION_COPY.cue_collapse}</Text>
          {renegotiatingCue ? (
            <View style={styles.pickerBlock}>
              <CueEditor cue={cue} onSave={onSaveCue} />
              <ActionButton label="Done" onPress={onDismiss} style={styles.inlineBtn} />
            </View>
          ) : (
            <View style={styles.row}>
              <ActionButton label="Update it" onPress={() => setRenegotiatingCue(true)} style={styles.inlineBtn} />
              <ActionButton label="Still the same" variant="secondary" onPress={onDismiss} style={styles.inlineBtn} />
            </View>
          )}
        </View>
      );
    }

    if (response.route === 'book_fatigue') {
      return (
        <View style={styles.zone}>
          <Text style={styles.prompt}>{ONE_QUESTION_COPY.book_fatigue}</Text>
          {pickingBook !== null ? (
            <View style={styles.pickerBlock}>
              <BookPicker excludeId={currentBookId} selected={pickingBook} onSelect={setPickingBook} />
              {pickingBook && (
                <ActionButton
                  label="Switch now"
                  onPress={() => {
                    onExitBook(pickingBook);
                    onDismiss();
                  }}
                  style={styles.inlineBtn}
                />
              )}
            </View>
          ) : (
            <View style={styles.row}>
              <ActionButton label="Pick something else" onPress={() => setPickingBook('')} style={styles.inlineBtn} />
              <ActionButton label="Keep going" variant="secondary" onPress={onDismiss} style={styles.inlineBtn} />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.zone}>
        <Text style={styles.prompt}>{ONE_QUESTION_COPY[response.route] ?? ONE_QUESTION_COPY.drift}</Text>
        <ActionButton label="OK" variant="secondary" onPress={onDismiss} style={styles.inlineBtn} />
      </View>
    );
  }

  if (response.action === 'offramp') {
    return (
      <View style={styles.zone}>
        <Text style={styles.prompt}>It&apos;s been a couple of weeks. What would help?</Text>
        <View style={styles.row}>
          <ActionButton
            label="Pause"
            variant="secondary"
            onPress={() => {
              onPause();
              onDismiss();
            }}
            style={styles.inlineBtn}
          />
          <ActionButton
            label="Keep nudging"
            variant="secondary"
            onPress={() => {
              onKeepNudging();
              onDismiss();
            }}
            style={styles.inlineBtn}
          />
          {response.options.includes('handoff') && partnerName && (
            <ActionButton
              label={`Talk to ${partnerName}`}
              variant="secondary"
              onPress={() => {
                onHandoff();
                onDismiss();
              }}
              style={styles.inlineBtn}
            />
          )}
        </View>
      </View>
    );
  }

  if (response.action !== 'dormant') return null; // 'none'/'reduce_dose' never reach this component — see lapse.ts

  return (
    <View style={styles.zone}>
      <Text style={styles.farewell}>
        I&apos;ll be here.
        {response.farewell === 'handoff' && partnerName
          ? ` If you want to talk to someone about it, ${partnerName} is one tap away.`
          : ''}
      </Text>
      <View style={styles.row}>
        {response.farewell === 'handoff' && partnerName && (
          <ActionButton label={`Talk to ${partnerName}`} variant="secondary" onPress={onHandoff} style={styles.inlineBtn} />
        )}
        <ActionButton label="OK" variant="secondary" onPress={onDismiss} style={styles.inlineBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
  },
  prompt: {
    fontFamily: tokens.font.scripture,
    fontSize: 17,
    lineHeight: 26,
    color: tokens.color.ink,
  },
  farewell: {
    fontFamily: tokens.font.scripture,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 28,
    color: tokens.color.ink,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerBlock: {
    gap: 12,
  },
  inlineBtn: {
    alignSelf: 'flex-start',
  },
});
