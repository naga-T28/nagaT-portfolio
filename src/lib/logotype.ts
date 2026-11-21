/**
 * Geometry of the nagaT logotype, drawn on a 1346 × 360 grid so it stays sharp at any size.
 *
 * The name is the structure: the letters N A G A hang between two horizontal bars, and each bar is the
 * crossbar of a T. One T drops down on the upper right of the word (see Hero.astro), the other drops from
 * the band under the word. ROOTS below is that lower T: a heavy central stem with thin lines beside it.
 */
export const LOGO_WIDTH = 1346;
export const LOGO_HEIGHT = 360;

const a = (x: number) =>
  `M${x} 360L${x + 119} 0H${x + 237}L${x + 356} 360H${x + 252}L${x + 232} 300H${x + 124}L${x + 104} 360ZM${x + 178} 136L${x + 145} 236H${x + 211}Z`;

const g = (x: number) =>
  `M${x + 84} 0H${x + 312}V96H${x + 112}Q${x + 96} 96 ${x + 96} 112V248Q${x + 96} 264 ${x + 112} 264H${x + 216}V216H${x + 150}V148H${x + 312}V360H${x + 84}Q${x} 360 ${x} 276V84Q${x} 0 ${x + 84} 0Z`;

const N_PATH = 'M0 0H122L234 196V0H330V360H208L96 164V360H0Z';

const A1 = 326;
const G = 678;
const A2 = 990;

/** The letters touch at their feet, so the word reads as one black mass with white counters. */
export const letters = [
  { glyph: 'N', d: N_PATH },
  { glyph: 'A', d: a(A1) },
  { glyph: 'G', d: g(G) },
  { glyph: 'A', d: a(A2) },
];

/** N_SLIT follows the diagonal of the N. The other cut runs down the G, in line with its inner stem. */
const N_SLIT = '57,0 67,0 273,360 263,360';

export const slits = [N_SLIT, `${G + 208},0 ${G + 216},0 ${G + 216},360 ${G + 208},360`];

const CENTER = LOGO_WIDTH / 2;
const STEM_WIDTH = 340;

/** Pairs of [distance from the centre to the bar's inner edge, bar width], mirrored left and right. */
const FLANKS: [number, number][] = [
  [192, 8],
  [216, 18],
  [252, 6],
  [404, 26],
  [444, 6],
  [604, 18],
];

/** The stem of the lower T and its flanking lines. */
export const roots = [
  { x: CENTER - STEM_WIDTH / 2, width: STEM_WIDTH },
  ...FLANKS.flatMap(([offset, width]) => [
    { x: CENTER - offset - width, width },
    { x: CENTER + offset, width },
  ]),
];

/** The stem of a T hanging from a band: three bars that grow heavier to the right, on a 190-unit grid. */
export const T_STEM_WIDTH = 190;
export const tStemBars = [
  { x: 0, width: 28 },
  { x: 44, width: 48 },
  { x: 108, width: 82 },
];
