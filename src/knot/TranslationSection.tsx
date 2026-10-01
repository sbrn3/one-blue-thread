import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Provider, TranslationService } from '../text/translationService';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface TranslationSectionProps {
  translation: TranslationService;
  /** Called after a successful switch — the caller (Knot → App.tsx) rebuilds services so it takes effect. */
  onChanged: () => void;
}

export const WEB_NAME = 'World English Bible (WEB)';
const LABEL: Record<Provider, string> = { niv: 'NIV', esv: 'ESV' };
const SOURCE: Record<Provider, string> = { niv: 'via API.Bible', esv: 'via api.esv.org' };

export function translationName(current: Provider | null): string {
  return current ? LABEL[current] : WEB_NAME;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * §04/§19 — translation is a confound (logged inside TranslationService), so
 * this mirrors BackupSection's shape (inline form, busy state, Alert on
 * failure) rather than inventing new knot chrome. A key is proved with a live
 * round-trip before it is ever saved (docs/plans/knot-translation-switch): a
 * bad key refuses the save and leaves the current translation untouched, so
 * the reader is never silently put back on the WEB while believing otherwise.
 */
export function TranslationSection({ translation, onChanged }: TranslationSectionProps) {
  const [current, setCurrent] = useState(() => translation.current());
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Provider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setPicked(current);
    setApiKey(current ? (translation.keyFor(current) ?? '') : '');
    setEditing(true);
  };

  const pick = (provider: Provider | null) => {
    if (provider === picked) return; // re-tapping the selected card must not clobber typing
    setPicked(provider);
    setApiKey(provider ? (translation.keyFor(provider) ?? '') : ''); // a key used before is kept per provider
  };

  const saveLicensed = async () => {
    const key = apiKey.trim();
    if (!picked || !key) return;
    setBusy(true);
    try {
      const validated = await translation.validate(picked, key);
      translation.set(picked, key, validated);
      setCurrent(picked);
      setEditing(false);
      onChanged();
    } catch (e) {
      Alert.alert('Could not verify that key', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const useWeb = () => {
    translation.setOffline();
    setCurrent(null);
    setEditing(false);
    onChanged();
  };

  if (!editing) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.body}>
          Reading in <Text style={styles.strong}>{translationName(current)}</Text>.
          {current ? '' : ' Public domain, always available offline.'}
        </Text>
        <ActionButton label="Change translation" variant="secondary" onPress={startEdit} style={styles.btn} />
      </View>
    );
  }

  const cards: Array<{ id: Provider | null; title: string; note: string }> = [
    { id: 'niv', title: LABEL.niv, note: SOURCE.niv },
    { id: 'esv', title: LABEL.esv, note: SOURCE.esv },
    { id: null, title: WEB_NAME, note: 'public domain — always offline, no key' },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>
        Changing translation restarts today&apos;s reading at the first sitting, and counts as a change to your
        routine for the experiments.
      </Text>

      {cards.map((card) => {
        const selected = picked === card.id;
        return (
          <Pressable
            key={card.title}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => pick(card.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${card.title}, ${card.note}`}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardNote}>{card.note}</Text>
          </Pressable>
        );
      })}

      {picked !== null && (
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Paste your API key"
          placeholderTextColor={tokens.color.ink40}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={`${LABEL[picked]} API key`}
        />
      )}

      <View style={styles.row}>
        <ActionButton label="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={busy} />
        {picked === null ? (
          <ActionButton label="Use the WEB" onPress={useWeb} disabled={current === null} />
        ) : (
          <ActionButton label="Verify and save" onPress={saveLicensed} busy={busy} disabled={!apiKey.trim()} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  body: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink60,
  },
  strong: { color: tokens.color.ink },
  btn: { alignSelf: 'flex-start', borderColor: tokens.color.ink15 },
  card: {
    minHeight: tokens.control.minTarget,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: tokens.color.thread,
    backgroundColor: tokens.color.dyeSoft,
  },
  cardTitle: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 14,
    color: tokens.color.ink,
  },
  cardNote: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  input: {
    minHeight: tokens.control.minTarget,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
    paddingHorizontal: 14,
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
