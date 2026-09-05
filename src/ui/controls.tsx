import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { tokens } from './tokens';

// Shared accessible primitives (docs/plans/app-quality-foundations). Each
// owns accessibilityRole/State, a 44pt floor, pressed/disabled/busy styling,
// and label wrapping — no business logic. Call sites keep their own copy and
// callbacks; only the Pressable/Text plumbing moves here.

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

type ActionVariant = 'primary' | 'secondary' | 'quiet' | 'link';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  /** Opt in only where the larger tap area can't overlap a neighbouring target. */
  hitSlop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  accessibilityHint,
  hitSlop = false,
  style,
}: ActionButtonProps) {
  const isDisabled = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={hitSlop ? HIT_SLOP : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy }}
      style={({ pressed }) => [
        styles.actionBase,
        variantStyles[variant].base,
        pressed && !isDisabled && variantStyles[variant].pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.actionLabel, variantStyles[variant].label]}>{label}</Text>
    </Pressable>
  );
}

interface ChoiceChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** A single choice in a row of mutually exclusive options — grade/Likert/weekday rows. */
export function ChoiceChip({ label, onPress, selected = false, disabled = false, accessibilityHint, style }: ChoiceChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !disabled && styles.chipPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

interface IconButtonProps {
  /** Required — this control has no visible label, so the accessible name comes from here. */
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** An icon/glyph-only control — close, dismiss, disclosure toggles. */
export function IconButton({
  accessibilityLabel,
  onPress,
  children,
  disabled = false,
  accessibilityHint,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && !disabled && styles.iconButtonPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionBase: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    paddingHorizontal: tokens.space[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    flexShrink: 1,
  },
  actionLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  disabled: {
    opacity: 0.4,
  },
  chip: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    paddingHorizontal: tokens.space[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.ink15,
  },
  chipSelected: {
    backgroundColor: tokens.color.thread,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '600',
    fontSize: 13,
    color: tokens.color.ink,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  chipLabelSelected: {
    color: tokens.color.paper,
  },
  iconButton: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
});

const variantStyles: Record<ActionVariant, { base: ViewStyle; pressed: ViewStyle; label: TextStyle }> = {
  primary: {
    base: { backgroundColor: tokens.color.ink },
    pressed: { backgroundColor: tokens.color.thread },
    label: { color: tokens.color.paper },
  },
  secondary: {
    base: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.color.ink },
    pressed: { borderColor: tokens.color.thread },
    label: { color: tokens.color.ink },
  },
  quiet: {
    base: { backgroundColor: tokens.color.ink15 },
    pressed: { backgroundColor: tokens.color.ink15, opacity: 0.8 },
    label: { color: tokens.color.ink },
  },
  link: {
    base: { backgroundColor: 'transparent', paddingHorizontal: tokens.space[2] },
    pressed: { opacity: 0.7 },
    label: { color: tokens.color.ink40, textDecorationLine: 'underline', fontWeight: '600' },
  },
};
