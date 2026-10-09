import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ActionButton } from '../ui/controls';
import { fellLineLength, fellLinePath, lineAmp } from '../ui/fellLine';
import { tokens } from '../ui/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The seal is the fell line, made a thing you press: a thread run across the
// page at the edge between what is read and what is not. Holding draws the weft
// along it and pulls it taut; releasing early pulls it back out. Same gesture,
// same timings, same shared value — only the mark changes. The rail's fell
// meets this line (ThreadRail), so the page and the rail read as one object.
const ROW_H = 84;
const LINE_X0 = 13; // the rail's centre, so the line leaves the rail
const SCROLL_PAD_LEFT = 30; // Flow's ScrollView paddingLeft; the row bleeds back over it
const PULSES = 6; // haptic pulses over the hold, evenly spaced
const UNWIND_MS = tokens.motion.unwindMs;
const SETTLE_MS = tokens.motion.settleMs;
const FADE_MS = tokens.motion.fadeMs;

interface SealZoneProps {
  sealed: boolean;
  reducedMotion: boolean;
  onSeal: () => void;
  onHoldCancel: () => void;
  onScrollLock: (locked: boolean) => void;
  /** §14 E1, applied: 'tap' renders the pressable pill unconditionally, independent of accessibility state. Defaults to 'hold'. */
  sealMode?: 'hold' | 'tap';
  /** §14 E4, applied — the completion floor: whether today's reading has met the bar to seal yet. Defaults to true (no gate) when omitted. */
  canSeal?: boolean;
  /** §14 E4, applied — which floor is active, so the helper text names the actual bar ("Read to the end" vs "Start reading"). Defaults to 'full_chapter'. */
  floor?: 'full_chapter' | 'one_verse';
  /** Day number shown on the sealed line ("Sealed · day 12"); null when the day count is hidden. */
  dayLabel?: number | null;
  /** Content-Y of the seal line's centre, so the rail's fell can lock onto it. */
  onLineLayout?: (contentY: number) => void;
}

/**
 * §05 / §13.4 — the highest-risk code in the app. A LongPress
 * (minDuration ~1.2s, maxDistance 20px so small drift doesn't cancel
 * it) on the pill, composed with the scroll view via Gesture.Simultaneous
 * so neither steals the other. Scroll is disabled for the duration of
 * the hold (onScrollLock) rather than relying on gesture arbitration
 * alone. Release early → the line unwinds and nothing is logged but
 * hold_cancel (§06 — the annoyance signal); holding the full duration
 * commits the seal.
 *
 * §04 accessibility floor: every gesture needs a tap fallback. A
 * screen reader flattens gesture-handler's press timing, so with one
 * active (or under reduced motion, where the line wouldn't animate
 * anyway) the pill is a plain button that seals immediately instead.
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
  dayLabel = null,
  onLineLayout,
}: SealZoneProps) {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [twoTapArmed, setTwoTapArmed] = useState(false);
  const ringProgress = useSharedValue(sealed ? 1 : 0);
  const sealFade = useSharedValue(sealed ? 1 : 0);
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

  // react-native-svg has no getTotalLength, so the dash length comes from the
  // generated polyline at its slackest — guessing high would make the pass
  // finish before the hold does.
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(windowWidth);
  const liveLength = useMemo(() => fellLineLength(rowWidth, LINE_X0), [rowWidth]);
  const baseY = ROW_H / 2;
  const barePath = useMemo(() => fellLinePath(rowWidth, LINE_X0, lineAmp(0), baseY), [rowWidth, baseY]);

  const weftProps = useAnimatedProps(() => ({
    d: fellLinePath(rowWidth, LINE_X0, lineAmp(ringProgress.value), baseY),
    strokeDashoffset: liveLength * (1 - ringProgress.value),
  }));

  // Sealed by any route (hold, tap, two taps): pull the line taut if it is not
  // already, and swap the pill for the day label. Unsealed (a new day) resets.
  useEffect(() => {
    if (sealed) {
      if (reducedMotion) {
        ringProgress.value = 1;
        sealFade.value = 1;
      } else {
        ringProgress.value = withTiming(1, { duration: SETTLE_MS });
        sealFade.value = withTiming(1, { duration: FADE_MS });
      }
    } else {
      cancelAnimation(ringProgress);
      ringProgress.value = 0;
      sealFade.value = 0;
    }
  }, [sealed, reducedMotion, ringProgress, sealFade]);

  const pillStyle = useAnimatedStyle(() => {
    const holding = ringProgress.value > 0 && sealFade.value === 0;
    return {
      opacity: 1 - sealFade.value,
      borderColor: holding ? tokens.color.thread : tokens.color.ink,
      transform: [{ scale: holding ? 0.985 : 1 }],
    };
  });
  const pillLabelStyle = useAnimatedStyle(() => ({
    color: ringProgress.value > 0 && sealFade.value === 0 ? tokens.color.thread : tokens.color.ink,
  }));
  const sealedStyle = useAnimatedStyle(() => ({ opacity: sealFade.value }));

  // Report the line's content-Y (zone y + row y + half the row) so the rail can
  // lock onto it. The two layouts arrive separately, children first.
  const zoneY = useRef<number | null>(null);
  const rowY = useRef<number | null>(null);
  const reportLine = () => {
    if (zoneY.current !== null && rowY.current !== null) onLineLayout?.(zoneY.current + rowY.current + ROW_H / 2);
  };

  const interactive = sealMode === 'tap' || screenReaderEnabled || reducedMotion;

  const pillBody = <Animated.Text style={[styles.pillLabel, pillLabelStyle]}>{helperText}</Animated.Text>;

  return (
    <View
      style={styles.zone}
      onLayout={(e) => {
        zoneY.current = e.nativeEvent.layout.y;
        reportLine();
      }}
    >
      <View
        style={styles.row}
        onLayout={(e) => {
          rowY.current = e.nativeEvent.layout.y;
          setRowWidth(e.nativeEvent.layout.width);
          reportLine();
        }}
      >
        {/* the warp line at rest, and the weft passing along it */}
        <Svg style={styles.line} width={rowWidth} height={ROW_H} pointerEvents="none" accessible={false}>
          <Path d={barePath} stroke={tokens.color.warp} strokeWidth={1.6} strokeOpacity={0.45} strokeLinecap="round" fill="none" />
          <AnimatedPath
            stroke={tokens.color.thread}
            strokeWidth={3}
            strokeOpacity={0.95}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={liveLength}
            animatedProps={weftProps}
          />
        </Svg>

        {interactive ? (
          <Pressable
            onPress={onSeal}
            disabled={sealed || !canSeal}
            style={({ pressed }) => [!canSeal && styles.disabled, pressed && canSeal && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Seal today's reading"
            accessibilityState={{ disabled: !canSeal }}
          >
            <Animated.View style={[styles.pill, pillStyle]} pointerEvents={sealed ? 'none' : 'auto'}>
              {pillBody}
            </Animated.View>
          </Pressable>
        ) : (
          <GestureDetector gesture={composed}>
            <Animated.View
              style={[styles.pill, pillStyle, !canSeal && styles.disabled]}
              accessible={false}
              pointerEvents={sealed ? 'none' : 'auto'}
            >
              {pillBody}
            </Animated.View>
          </GestureDetector>
        )}

        {sealed ? (
          <Animated.View style={[styles.sealedWrap, sealedStyle]} pointerEvents="none">
            <Text style={styles.sealedLabel}>{typeof dayLabel === 'number' ? `Sealed · day ${dayLabel}` : 'Sealed'}</Text>
          </Animated.View>
        ) : null}
      </View>

      {!sealed && !interactive ? (
        !twoTapArmed ? (
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
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    alignItems: 'stretch',
    marginTop: tokens.space[4],
  },
  row: {
    marginLeft: -SCROLL_PAD_LEFT,
    paddingLeft: SCROLL_PAD_LEFT, // keeps the pill centred on the text column
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pill: {
    minHeight: 48,
    paddingHorizontal: tokens.space[6],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.ink,
    backgroundColor: tokens.color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    transform: [{ scale: 0.985 }],
  },
  pillLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 14,
    color: tokens.color.ink,
  },
  disabled: {
    opacity: 0.4,
  },
  sealedWrap: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: tokens.color.paper,
  },
  sealedLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.color.thread,
  },
  twoTapLink: {
    alignSelf: 'center',
    marginTop: 4,
  },
  twoTapConfirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
});
