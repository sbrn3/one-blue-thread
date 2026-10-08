import Svg, { Path } from 'react-native-svg';
import { tokens } from './tokens';

// A printed book's headpiece and tailpiece, as one hairline thread
// (docs/plans/bibleproject-book-videos, plan.html → Aesthetics). Purely
// decorative: it carries no meaning, never animates, and is hidden from
// screen readers. The headpiece opens a book; the tailpiece closes one.
const HEAD = 'M8 16 C 52 16, 74 9, 104 12 C 124 14, 132 22, 124 24 C 114 26, 112 10, 132 9 C 156 8, 186 15, 232 14';
const TAIL = 'M70 15 C 96 15, 108 8, 120 8 C 132 8, 134 20, 120 20 C 108 20, 110 11, 128 11 C 146 11, 152 15, 170 15';
const TAIL_RULE = 'M40 15 H 200';

interface OrnamentProps {
  kind: 'head' | 'tail';
  /** Drawn width; the height follows the 240×28 artwork. */
  width?: number;
}

export function Ornament({ kind, width = 240 }: OrnamentProps) {
  return (
    <Svg
      width={width}
      height={(width * 28) / 240}
      viewBox="0 0 240 28"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {kind === 'tail' && <Path d={TAIL_RULE} stroke={tokens.color.warp} strokeWidth={0.9} strokeOpacity={0.55} fill="none" />}
      <Path
        d={kind === 'head' ? HEAD : TAIL}
        stroke={tokens.color.thread}
        strokeWidth={1.15}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
