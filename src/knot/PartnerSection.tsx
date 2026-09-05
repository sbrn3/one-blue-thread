import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { Partner } from '../partner';
import { ActionButton, ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface PartnerSectionProps {
  partner: Partner;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * §12 "the partner practice" — one person, not a group; content
 * shared, never compliance. This is the only place any of this is
 * entered; the app never suggests who, never prompts to add one.
 */
export function PartnerSection({ partner }: PartnerSectionProps) {
  const [name, setName] = useState('');
  const [contactRef, setContactRef] = useState('');
  const [convoAnchor, setConvoAnchor] = useState('');
  const [convoDay, setConvoDay] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void partner.get().then((p) => {
      if (p) {
        setName(p.name);
        setContactRef(p.contactRef);
        setConvoAnchor(p.convoAnchor);
        setConvoDay(p.convoDay);
        setSaved(true);
      }
    });
  }, [partner]);

  const handleSave = () => {
    if (!name.trim() || !contactRef.trim()) return;
    void partner.set({ name: name.trim(), contactRef: contactRef.trim(), convoAnchor: convoAnchor.trim(), convoDay }).then(
      () => setSaved(true),
    );
  };

  const handleClear = () => {
    void partner.clear().then(() => {
      setName('');
      setContactRef('');
      setConvoAnchor('');
      setConvoDay(0);
      setSaved(false);
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        One person. Same book, not same pace. A weekly conversation, anchored to something that already
        happens — never &quot;did you read?&quot;
      </Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Their name"
        placeholderTextColor={tokens.color.ink40}
      />
      <TextInput
        style={styles.input}
        value={contactRef}
        onChangeText={setContactRef}
        placeholder="Phone number"
        placeholderTextColor={tokens.color.ink40}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        value={convoAnchor}
        onChangeText={setConvoAnchor}
        placeholder="Anchored to... (e.g. after Sunday coffee)"
        placeholderTextColor={tokens.color.ink40}
      />
      <View style={styles.dayRow}>
        {DAY_LABELS.map((label, i) => (
          <ChoiceChip key={label} label={label} selected={convoDay === i} onPress={() => setConvoDay(i)} />
        ))}
      </View>
      <View style={styles.formRow}>
        <ActionButton label={saved ? 'Update' : 'Save'} onPress={handleSave} />
        {saved && <ActionButton label="Remove" variant="secondary" onPress={handleClear} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.ink40,
  },
  input: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
    paddingVertical: 8,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
});
