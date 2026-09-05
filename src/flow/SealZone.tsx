import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { ActionButton } from '../ui/controls';
import { geometry, polylineLength, ridesOver, warpPath, weftPath, weftPoints } from '../ui/loom';
import { tokens } from '../ui/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The seal is a shuttle pass: holding draws the weft across the warp, and
// releasing early pulls it back out. Same gesture, same timings, same shared
// value — only the mark changes.
const LOOM_W = 168;
const LOOM_H = 96;
const WOVEN_ROWS = 4; // cloth already made, above the pass being worked
const STROKE = 6;
const PULSES = 6; // haptic pulses over the hold, evenly spaced
const UNWIND_MS = 220;

interface SealZoneProps {
  sealed: boolean;
  reducedMotion: boolean;
  onSeal: () => void;
  onHoldCancel: () => void;
  onScrollLock: (locked: boolean) => void;
  /** §14 E1, applied: 'tap' renders the fallback button unconditionally, independent of accessibility state. Defaults to 'hold'. */
  sealMode?: 'hold' | 'tap';
  /** §14 E4, applied — the completion floor: whether today's reading has met the bar to seal yet. Defaults to true (no gate) when omitted. */
  canSeal?: boolean;
  /** §14 E4, applied — which floor is active, so the helper text names the actual bar ("Read to the end" vs "Start reading"). Defaults to 'full_chapter'. */
  floor?: 'full_chapter' | 'one_verse';
}

/**
 * §05 / §13.4 — the highest-risk code in the app. A LongPress
 * (minDuration ~1.2s, maxDistance 20px so small drift doesn't cancel
 * it) composed with the scroll view via Gesture.Simultaneous so
 * neither steals the other. Scroll is disabled for the duration of
 * the hold (onScrollLock) rather than relying on gesture arbitration
 * alone. Release early → the ring unwinds and nothing is logged but
 * hold_cancel (§06 — the annoyance signal); holding the full duration
 * commits the seal.
 *
 * §04 accessibility floor: every gesture needs a tap fallback. A
 * screen reader flattens gesture-handler's press timing, so with one
 * active (or under reduced motion, where the ring wouldn't animate
 * anyway) this renders a plain button that seals immediately instead.
 */
export function SealZone({
  sealed,
  reducedMotion,
  onSeal,
  onHoldCancel,
  onScrollLock,
  sealMode = 'hold',
  canSeal = true,
  floor = 'full_chapter',
}: SealZoneProps) {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [twoTapArmed, setTwoTapArmed] = useState(false);
  const ringProgress = useSharedValue(0);
  const pulseTick = useSharedValue(0);

  useEffect(() => {
    if (sealed) setTwoTapArmed(false);
  }, [sealed]);

  const helperText = canSeal ? 'Hold to seal' : floor === 'one_verse' ? 'Start reading to seal' : 'Read to the end to seal';

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => sub.remove();
  }, []);

  const triggerPulse = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const triggerSuccess = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSeal();
  };

  const hold = Gesture.LongPress()
    .minDuration(tokens.seal.holdMs)
    .maxDistance(tokens.seal.maxDriftPx)
    .enabled(canSeal)
    .onBegin(() => {
      runOnJS(onScrollLock)(true);
      ringProgress.value = withTiming(1, { duration: tokens.seal.holdMs, easing: Easing.linear });
      pulseTick.value = 0;
      pulseTick.value = withSequence(
        ...Array.from({ length: PULSES }, () =>
          withTiming(1, { duration: tokens.seal.holdMs / PULSES }, (finished) => {
            if (finished) runOnJS(triggerPulse)();
          }),
        ),
      );
    })
    .onFinalize((_event, success) => {
      runOnJS(onScrollLock)(false);
      cancelAnimation(pulseTick);
      if (success) {
        cancelAnimation(ringProgress);
        ringProgress.value = 1;
        runOnJS(triggerSuccess)();
      } else {
        cancelAnimation(ringProgress);
        ringProgress.value = withTiming(0, { duration: UNWIND_MS }); // release early → unwinds, nothing logged
        runOnJS(onHoldCancel)();
      }
    });

  const composed = Gesture.Simultaneous(hold, Gesture.Native());

  // The little loom. The live row sits after the woven ones so the pass lands
  // against finished cloth. react-native-svg has no getTotalLength, so the dash
  // length is computed from the generated polyline — guessing high would make
  // the pass finish before the hold does.
  const loom = useMemo(() => {
    const g = geometry(LOOM_W, LOOM_H, 7, Array<boolean>(WOVEN_ROWS + 1).fill(true), { pad: 8 });
    return { g, liveLength: polylineLength(weftPoints(g, WOVEN_ROWS)) };
  }, []);

  const weftProps = useAnimatedProps(() => ({
    strokeDashoffset: loom.liveLength * (1 - ringProgress.value),
  }));

  if (sealed) {
    return (
      <View style={styles.zone}>
        <Text style={styles.sealedLabel}>Sealed</Text>
      </View>
    );
  }

  if (sealMode === 'tap' || screenReaderEnabled || reducedMotion) {
    return (
      <View style={styles.zone}>
        <Pressable
          onPress={onSeal}
          disabled={!canSeal}
          style={({ pressed }) => [
            styles.ringFallback,
            pressed && canSeal && styles.ringPressed,
            !canSeal && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Seal today's reading"
          accessibilityState={{ disabled: !canSeal }}
        >
          <Text style={styles.ringLabel}>Seal</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      <GestureDetector gesture={composed}>
        <View style={[styles.ringWrap, !canSeal && styles.disabled]} accessible={false}>
          <Svg width={LOOM_W} height={LOOM_H}>
            {/* the warp, strung and waiting */}
            <G>
              {Array.from({ length: loom.g.sett.drawnCols }, (_, i) => (
                <Path
                  key={`w${i}`}
                  d={warpPath(loom.g, i, 0, WOVEN_ROWS)}
                  stroke={tokens.color.warp}
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </G>
            {/* cloth already made */}
            <G>
              {Array.from({ length: WOVEN_ROWS }, (_, j) => (
                <Path
                  key={`f${j}`}
                  d={weftPath(loom.g, j)}
                  stroke={tokens.color.thread}
                  strokeWidth={3.4}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </G>
            <G>
              {Array.from({ length: WOVEN_ROWS }, (_, j) =>
                Array.from({ length: loom.g.sett.drawnCols }, (_, i) => i)
                  .filter((i) => ridesOver(i, j))
                  .map((i) => (
                    <Path
                      key={`o${i}-${j}`}
                      d={warpPath(loom.g, i, j, j)}
                      stroke={tokens.color.warp}
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                    />
                  )),
              )}
            </G>
            {/* the pass you are making right now */}
            <AnimatedPath
              d={weftPath(loom.g, WOVEN_ROWS)}
              stroke={tokens.color.thread}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={loom.liveLength}
              animatedProps={weftProps}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </GestureDetector>
      <Text style={styles.holdLabel}>{helperText}</Text>

      {!twoTapArmed ? (
        <ActionButton
          label="Use two taps instead"
          variant="link"
          onPress={() => setTwoTapArmed(true)}
          disabled={!canSeal}
          style={styles.twoTapLink}
        />
      ) : (
        <View style={styles.twoTapConfirmRow}>
          <ActionButton
            label="Seal today"
            onPress={() => {
              setTwoTapArmed(false);
              triggerSuccess();
            }}
            disabled={!canSeal}
          />
          <ActionButton label="Cancel" variant="secondary" onPress={() => setTwoTapArmed(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdLabel: {
    // Sits below the loom rather than centred on it: the mark is now a wide
    // piece of cloth, and a label over the middle of it is unreadable.
    marginTop: 14,
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.ink,
  },
  twoTapLink: {
    marginTop: 4,
  },
  twoTapConfirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  ringFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: tokens.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPressed: {
    borderColor: tokens.color.thread,
  },
  disabled: {
    opacity: 0.4,
  },
  ringLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.ink,
  },
  sealedLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.color.thread,
  },
});
