// The mark: a weft caught mid-pass. 3 warp threads, 2 weft passes.
//
// Interlacing is one mask: warp is painted solid, then the weft is painted
// through a mask that knocks out a band slightly wider than each warp thread
// at the crossings where that warp rides over. The knockout reads as
// separation in colour and as a genuine hole in the monochrome silhouette.
//
// Thread count is a legibility budget, not a style choice: 4 warps at 76px
// pitch left only ~10px of weft between knockouts and shattered the mono
// version into fragments. 3 warps at 96px pitch leave ~34px and survive both
// monochrome and 48px.
export function markSVG({ warp, dye, mono = false, scale = 0.78, id = 'm' }) {
  const warps = [
    'M160 92 C 140 200, 178 314, 156 430',
    'M256 80 C 236 200, 274 320, 252 442',
    'M352 90 C 332 200, 370 316, 348 432',
  ];
  // Weft 0 emerges just past the last warp. Weft 1 is still travelling and
  // leaves the canvas — the cloth is not finished.
  const wefts = [
    'M70 200 C 170 168, 300 214, 404 188',
    'M70 330 C 180 302, 340 348, 496 262',
  ];
  // Plain weave: alternating over/under on both axes.
  const bands = [
    { y: 128, h: 128, over: [1] },      // weft 0 passes under warp 1
    { y: 256, h: 148, over: [0, 2] },   // weft 1 passes under warps 0 and 2
  ];
  const WW = 46, FW = 50;
  const CUT = 16;
  const p = (d, stroke, width, cap = 'round') =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${cap}"/>`;

  let defs = '<defs>';
  bands.forEach((b, i) => {
    defs += `<clipPath id="${id}-b${i}"><rect x="-80" y="${b.y}" width="680" height="${b.h}"/></clipPath>`;
  });
  defs += `<mask id="${id}-wm" maskUnits="userSpaceOnUse" x="-80" y="-80" width="680" height="680">`;
  defs += `<rect x="-80" y="-80" width="680" height="680" fill="#fff"/>`;
  bands.forEach((b, i) => {
    defs += `<g clip-path="url(#${id}-b${i})">`
         +  b.over.map((w) => p(warps[w], '#000', WW + CUT)).join('')
         +  `</g>`;
  });
  defs += `</mask></defs>`;

  // The artwork's own bbox centres on (283,261), not the canvas centre, because
  // weft 1 trails off to the right. Scale about the ARTWORK centre or the mark
  // sits right-of-centre and risks clipping inside Android's adaptive safe circle.
  let s = `${defs}<g transform="translate(256,256) rotate(-7) scale(${scale}) translate(-283,-261)">`;
  s += warps.map((d) => p(d, warp, WW)).join('');
  // Monochrome ships a SOLID lattice: with warp and weft the same colour a
  // knockout reads as a broken thread, not as one passing behind, so the
  // interlace is a colour-icon feature only. A themed icon is a tinted
  // silhouette; robustness beats depicting over/under.
  s += mono
    ? wefts.map((d) => p(d, dye, FW)).join('')
    : `<g mask="url(#${id}-wm)">` + wefts.map((d) => p(d, dye, FW)).join('') + `</g>`;
  s += `</g>`;
  return s;
}
