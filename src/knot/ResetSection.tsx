import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { deriveBolt } from '../flow/bolt';
import type { SqlDb } from '../log/db';
import type { Log } from '../log/log';
import { logicalToday } from '../log/time';
import { nativeResetEnv } from '../reset/nativeEnv';
import { performReset } from '../reset/perform';
import { bundledChapterCount } from '../text';
import { ActionButton } from '../ui/controls';
import { dyeFor } from '../ui/dye';
import { tokens } from '../ui/tokens';
import { Unravel } from '../ui/Unravel';

const UNRAVEL_WIDTH = 260;
const UNRAVEL_HEIGHT = 150;
const RESTORE_MS = 320;

interface ResetSectionProps {
  db: SqlDb;
  log: Log;
  /** Injected in tests; the app uses performReset + the native env. */
  onReset?: (onWiped: () => void) => Promise<void>;
}

/**
 * §20 "a clean start" — returning the app to first run.
 *
 * Not headed "Danger zone": One Blue Thread avoids alarm language everywhere else, and
 * this section is not exempt from its own register. The guard is the gesture,
 * not the shouting. Holding unravels the cloth of the book you are reading —
 * the deliberate inverse of the seal (docs/CONTEXT.md) — and the hold is
 * longer than the seal's so muscle memory from a daily action cannot carry into
 * an irreversible one. Release early and the cloth re-weaves.
 *
 * Where a hold cannot be offered (screen reader active, or reduced motion) this
 * falls back to a two-tap confirm rather than a single tap: the accessible path
 * keeps the same deliberation as the default one.
 */
export function ResetSection({ db, log, onReset }: ResetSectionProps) {
  const reducedMotion = useReducedMotion();
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stranded, setStranded] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => sub.remove();
  }, []);

  const bolt = confirming ? deriveBolt(db, log, logicalToday()) : null;

  const run = async () => {
    setBusy(true);
    let wiped = false;
    try {
      const markWiped = () => {
        wiped = true;
      };
      await (onReset ? onReset(markWiped) : performReset(db, nativeResetEnv, markWiped));
      // performReset reloads the app; nothing after this normally runs.
      if (wiped) setStranded(true);
    } catch {
      // A failure before the wipe leaves everything intact — returning to the
      // sheet is correct. A failure after it has already destroyed the data,
      // and carrying on would let stores write deleted rows back.
      if (wiped) setStranded(true);
      else {
        setBusy(false);
        setConfirming(false);
      }
    }
  };

  const hold = Gesture.LongPress()
    .minDuration(tokens.reset.holdMs)
    .maxDistance(tokens.seal.maxDriftPx)
    .onBegin(() => {
      progress.value = withTiming(1, { duration: tokens.reset.holdMs, easing: Easing.linear });
    })
    .onFinalize((_event, success) => {
      cancelAnimation(progress);
      if (success) {
        progress.value = 1;
        runOnJS(run)();
      } else {
        progress.value = withTiming(0, { duration: RESTORE_MS }); // let go → it re-weaves
      }
    });

  if (stranded) {
    return (
      <View style={[styles.zone, styles.zoneStranded]}>
        <Text style={styles.zoneLabel}>Erased</Text>
        <Text style={styles.body}>
          Everything has been erased, but the app could not restart itself. Close it completely and
          open it again to begin.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      <Text style={styles.zoneLabel}>Starting over</Text>

      {busy ? (
        <ActivityIndicator color={tokens.color.ink40} />
      ) : !confirming ? (
        <>
          <Text style={styles.body}>Erase everything and return to the beginning.</Text>
          <ActionButton label="Start over" variant="secondary" onPress={() => setConfirming(true)} style={styles.btn} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            This erases everything — your reading history, what you&apos;re remembering, your cue and
            partner, and any backup passphrase. It cannot be undone. The app restarts at the
            beginning.
          </Text>

          {reducedMotion || screenReaderEnabled ? (
            <View style={styles.confirmRow}>
              <ActionButton label="Erase and start over" onPress={run} />
              <ActionButton label="Cancel" variant="secondary" onPress={() => setConfirming(false)} style={styles.btn} />
            </View>
          ) : (
            <>
              <GestureDetector gesture={hold}>
                <View style={styles.unravelWrap} accessible={false}>
                  {bolt && (
                    <Unravel
                      width={UNRAVEL_WIDTH}
                      maxHeight={UNRAVEL_HEIGHT}
                      chapterCount={bundledChapterCount(bolt.book)}
                      sealed={bolt.sealed}
                      dye={dyeFor(bolt.book)}
                      progress={progress}
                    />
                  )}
                </View>
              </GestureDetector>
              <View style={styles.confirmRow}>
                <Text style={styles.holdLabel}>Hold to unravel</Text>
                <ActionButton label="Cancel" variant="secondary" onPress={() => setConfirming(false)} style={styles.btn} />
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    gap: 12,
    borderWidth: 1,
    borderColor: tokens.color.ink,
    borderRadius: 12,
    padding: 16,
  },
  zoneStranded: {
    borderColor: tokens.color.madder,
  },
  zoneLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink,
  },
  body: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink60,
  },
  unravelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: UNRAVEL_HEIGHT,
  },
  holdLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.ink,
    alignSelf: 'center',
  },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  btn: {
    alignSelf: 'flex-start',
    borderColor: tokens.color.ink15,
  },
});
