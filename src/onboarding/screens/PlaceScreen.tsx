import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ChoiceChip } from '../../ui/controls';
import { tokens } from '../../ui/tokens';
import { OnboardingScreen } from '../OnboardingScreen';

interface PlaceScreenProps {
  place: string;
  onNext: (place: string) => void;
}

const SUGGESTIONS = ['the kitchen table', 'the armchair by the window', 'my desk', 'bed'];

export function PlaceScreen({ place: initialPlace, onNext }: PlaceScreenProps) {
  const [place, setPlace] = useState(initialPlace);

  return (
    <OnboardingScreen
      step="2 of 6 · The place"
      title="Where will you be?"
      sub="A specific place is a second cue. A vague one is none."
      primaryLabel="Next"
      primaryDisabled={place.trim().length < 2}
      onPrimary={() => onNext(place.trim())}
    >
      <TextInput
        style={styles.input}
        placeholder="the armchair by the window"
        placeholderTextColor={tokens.color.ink40}
        value={place}
        onChangeText={setPlace}
      />
      <View style={styles.chips}>
        {SUGGESTIONS.map((s) => (
          <ChoiceChip key={s} label={s} selected={place === s} onPress={() => setPlace(s)} />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: tokens.color.ink15,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: tokens.font.scripture,
    fontSize: 17,
    color: tokens.color.ink,
    marginBottom: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
