/**
 * The site's recurring stripe pattern is "nagaT" written in Morse code:
 * N  -.   A  .-   G  --.   A  .-   T  -
 * Dash = 4 units, dot = 2 units, gap inside a letter = 1 unit, gap between letters = 2 units.
 * The heavy proportions keep the stripes mostly black, so they read as the stem of the T.
 */
const NAGAT = ['-.', '.-', '--.', '.-', '-'];

export interface Bar {
  x: number;
  width: number;
}

export function morseBars(words: string[] = NAGAT): { bars: Bar[]; total: number } {
  const bars: Bar[] = [];
  let x = 0;
  words.forEach((letter, letterIndex) => {
    [...letter].forEach((symbol, symbolIndex) => {
      const width = symbol === '-' ? 4 : 2;
      bars.push({ x, width });
      x += width;
      if (symbolIndex < letter.length - 1) x += 1;
    });
    if (letterIndex < words.length - 1) x += 2;
  });
  return { bars, total: x };
}
