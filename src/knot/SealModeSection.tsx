import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getProfile, setProfile } from '../lab/profile';
import type { SqlDb } from '../log/db';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface SealModeSectionProps {
  db: SqlDb;
}

/**
 * §11's mechanic-friction override (src/lab/steps.ts) switches sealing
 * from hold to tap silently, the moment a lapse is diagnosed that way —
 * by design, no confirmation asked. It never switches back on its own;
 * this is the only way back short of a full reset.
 */
export function SealModeSection({ db }: SealModeSectionProps) {
  const [mode, setMode] = useState<'hold' | 'tap'>(() => (getProfile(db, 'seal') === 'tap' ? 'tap' : 'hold'));

  const flip = () => {
    const next = mode === 'tap' ? 'hold' : 'tap';
    setProfile(db, 'seal', next);
    setMode(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        {mode === 'tap'
          ? "Currently tap to seal. The app switches you here on its own if holding keeps getting cancelled — switch back whenever you like."
          : 'Currently hold to seal, the default. If holding keeps getting cancelled, the app switches you to tap on its own.'}
      </Text>
      <ActionButton
        label={mode === 'tap' ? 'Switch back to hold' : 'Switch to tap'}
        variant="secondary"
        onPress={flip}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink60,
  },
  btn: { alignSelf: 'flex-start' },
});
