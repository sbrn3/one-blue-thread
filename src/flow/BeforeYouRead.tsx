import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { easing, useMotion } from '../ui/motion';
import { tokens } from '../ui/tokens';
import { type BeforeInput, type BeforeItem, type BeforeKind, bodyMount, buildBeforeYouRead, withFinished } from './beforeList';

interface BeforeYouReadProps {
  input: BeforeInput;
  /**
   * The open row's body: the existing zone, embedded. Call `finish` once the
   * item is done for today (graded, skipped, answered, dismissed) and its row
   * folds to a quiet done line.
   */
  renderBody: (kind: BeforeKind, finish: () => void) => ReactNode;
}

const DOT: Record<BeforeKind, object> = {
  lapse: { backgroundColor: tokens.color.madder },
  probe: { backgroundColor: tokens.color.madder },
  memory: { backgroundColor: tokens.color.thread },
  whatsNew: { backgroundColor: tokens.color.ink15, borderWidth: 1, borderColor: tokens.color.ink40 },
};

const SEAM: Record<BeforeKind, string> = {
  lapse: tokens.color.madder,
  probe: tokens.color.madder,
  memory: tokens.color.thread,
  whatsNew: tokens.color.ink15,
};

/**
 * S07: an opened row's body is stitched down its left edge, top to bottom,
 * over motion.stitchMs; closing unpicks it before the body hides. A row that
 * starts open (lapse, probe) is simply there on first paint. The text itself
 * never fades. Reduce motion: open and closed at once.
 *
 * A folded body stays mounted, only hidden: the zones keep their own state
 * (which recall cards are graded, a revealed probe, a half-edited cue), so
 * folding and reopening can never offer a graded card for grading again.
 */
function StitchedBody({
  open,
  hidden,
  animateIn,
  seam,
  onClosed,
  children,
}: {
  open: boolean;
  /** Folded and fully unpicked. */
  hidden: boolean;
  animateIn: boolean;
  seam: string;
  onClosed: () => void;
  children: ReactNode;
}) {
  const { reduced, ms } = useMotion();
  const [height, setHeight] = useState(0);
  const sewn = useSharedValue(animateIn && !reduced ? 0 : 1);
  useEffect(() => {
    const duration = ms('stitchMs');
    if (open) sewn.value = withTiming(1, { duration, easing: easing('outCubic') });
    else
      sewn.value = withTiming(0, { duration, easing: easing('inOutCubic') }, (done) => {
        if (done) runOnJS(onClosed)();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const clip = useAnimatedStyle(() => ({ height: height * sewn.value }));

  return (
    <View style={[styles.body, hidden && styles.hidden]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <Animated.View style={[styles.stitchClip, clip]} pointerEvents="none">
        {height > 0 && (
          <Svg width={2} height={height}>
            <Line x1={1} y1={0} x2={1} y2={height} stroke={seam} strokeWidth={2} strokeDasharray="5 4" />
          </Svg>
        )}
      </Animated.View>
      {children}
    </View>
  );
}

/**
 * §04, Direction A (docs/plans/reading-screen-and-motion, S06): everything due
 * before the reading, in one list between the arrival header and Scripture.
 * The rows replace the separate lapse, recall, probe and what's-new blocks
 * that used to stack above the text. Nothing due renders nothing.
 *
 * Remount it each day (Flow keys it by date) so finished rows don't carry over.
 */
export function BeforeYouRead({ input, renderBody }: BeforeYouReadProps) {
  const [finished, setFinished] = useState<Partial<Record<BeforeKind, BeforeItem>>>({});
  const [opened, setOpened] = useState<Partial<Record<BeforeKind, boolean>>>({});
  // Closed, but still unpicking its stitch.
  const [closing, setClosing] = useState<Partial<Record<BeforeKind, boolean>>>({});
  const { reduced, ms } = useMotion();
  const layout = reduced ? undefined : LinearTransition.duration(ms('stitchMs'));

  const items = withFinished(buildBeforeYouRead(input), finished);
  if (items.length === 0) return null;

  const finish = (item: BeforeItem) => setFinished((prev) => (prev[item.kind] ? prev : { ...prev, [item.kind]: item }));

  return (
    <View style={styles.list}>
      <Text style={styles.header}>Before you read</Text>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        if (item.done) {
          return (
            <View key={item.kind} style={[styles.row, last && styles.rowLast]} accessible accessibilityLabel={`${item.title}, ${item.detail}`}>
              <View style={[styles.dot, DOT[item.kind], styles.dotDone]} />
              <View style={styles.text}>
                <Text style={[styles.title, styles.titleDone]}>{item.title}</Text>
                <Text style={styles.detail}>{item.detail}</Text>
              </View>
            </View>
          );
        }
        const open = opened[item.kind] ?? item.startsOpen;
        const mount = bodyMount(open, closing[item.kind] === true, opened[item.kind] !== undefined);
        const toggle = () => {
          if (open) setClosing((prev) => ({ ...prev, [item.kind]: true }));
          setOpened((prev) => ({ ...prev, [item.kind]: !open }));
        };
        return (
          <Animated.View key={item.kind} layout={layout}>
            <Pressable
              onPress={toggle}
              style={({ pressed }) => [styles.row, last && !open && styles.rowLast, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${item.title}, ${item.detail}`}
              hitSlop={8}
            >
              <View style={[styles.dot, DOT[item.kind]]} />
              <View style={styles.text}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.detail}>{item.detail}</Text>
              </View>
              <Text style={[styles.go, open && styles.goOpen]}>{open ? 'Hide' : item.action}</Text>
            </Pressable>
            {mount !== 'none' && (
              <StitchedBody
                open={open}
                hidden={mount === 'hidden'}
                animateIn={opened[item.kind] !== undefined}
                seam={SEAM[item.kind]}
                onClosed={() => setClosing((prev) => ({ ...prev, [item.kind]: false }))}
              >
                {renderBody(item.kind, () => finish(item))}
              </StitchedBody>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginHorizontal: 32,
    marginBottom: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.color.ink15,
  },
  header: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    paddingTop: 10,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
  },
  rowLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { opacity: 0.35 },
  text: { flex: 1 },
  title: { fontFamily: tokens.font.display, fontSize: 14, color: tokens.color.ink },
  titleDone: { color: tokens.color.ink40 },
  detail: { fontFamily: tokens.font.mono, fontSize: 11.5, color: tokens.color.ink40 },
  // Wraps rather than truncates at large font sizes.
  go: {
    maxWidth: '35%',
    textAlign: 'right',
    fontFamily: tokens.font.display,
    fontWeight: '600',
    fontSize: 13,
    color: tokens.color.thread,
  },
  goOpen: { color: tokens.color.ink40 },
  hidden: { display: 'none' },
  body: {
    marginLeft: 3,
    paddingLeft: 18,
    paddingBottom: 14,
  },
  // Android draws a one-sided dashed border solid, so the stitch is an SVG line.
  stitchClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    overflow: 'hidden',
  },
});
