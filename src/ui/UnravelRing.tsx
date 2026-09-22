import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { tokens } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE = 4;

interface UnravelRingProps {
  /** Diameter. Defaults to 96 — the seal's tap-mode fallback ring (SealZone.tsx). */
  size?: number;
  dye: string;
  /** 0 = whole cloth, 1 = fully unravelled. Driven by the hold. */
  progress: SharedValue<number>;
}

/**
 * The unravel, reshaped to read as "a normal circular button" — reader
 * feedback (issue #31): the wide cloth-strip bolt view (the old `Unravel`)
 * didn't look like a control. This matches the silhouette of the seal's own
 * circular fallback (SealZone.tsx's `ringFallback`, 96x96) instead of the
 * loom illustration.
 *
 * Still the deliberate inverse of the seal (docs/CONTEXT.md): the seal's
 * ring FILLS as you hold (thread being laid down); this one EMPTIES (thread
 * withdrawing). Colour is the current book's dye, so what's disappearing is
 * still legible as "this book" even reduced to a ring.
 */
export function UnravelRing({ size = 96, dye, progress }: UnravelRingProps) {
  const { radius, circumference } = useMemo(() => {
    const r = (size - STROKE) / 2;
    return { radius: r, circumference: 2 * Math.PI * r };
  }, [size]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * progress.value,
  }));

  const c = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Starting the sweep at 12 o'clock reads more like a clock/progress
            control than starting at 3 o'clock, where an SVG circle begins by default. */}
        <G rotation={-90} origin={`${c}, ${c}`}>
          <Circle cx={c} cy={c} r={radius} stroke={tokens.color.ink15} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={c}
            cy={c}
            r={radius}
            stroke={dye}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
    </View>
  );
}
