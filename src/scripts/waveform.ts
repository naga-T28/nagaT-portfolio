const CELL = 4;
const GAP = 2;
const PITCH = CELL + GAP;
const LOW_HZ = 45;
const HIGH_HZ = 14000;
const RISE = 0.55;
const FALL = 0.14;
const SETTLED = 0.004;

export interface Waveform {
  setProgress(progress: number): void;
  /** Shows the columns. Without an analyser they stay still as a single row, marking the position. */
  play(analyser: AnalyserNode | null): void;
  /** The columns fall away until nothing is left on screen. */
  stop(): void;
}

/**
 * Draws columns of squares rising from the bottom edge, following the sound: bass in the middle,
 * treble towards both ends. Played columns are ink and the rest are grey, which also shows the position.
 */
export function createWaveform(canvas: HTMLCanvasElement): Waveform {
  const context = canvas.getContext('2d');
  let progress = 0;
  let columns = 0;
  let rows = 0;
  let heights = new Float32Array(0);
  let scale = 1;
  let height = 0;
  let active = false;
  let analyser: AnalyserNode | null = null;
  let spectrum = new Uint8Array(0);
  let frame = 0;

  const level = (column: number): number => {
    if (!analyser) return 0;
    const distance = Math.abs(column + 0.5 - columns / 2) / (columns / 2);
    const nyquist = analyser.context.sampleRate / 2;
    const hz = (at: number): number => LOW_HZ * (HIGH_HZ / LOW_HZ) ** at;
    const from = Math.floor((hz(distance) / nyquist) * spectrum.length);
    const to = Math.max(from + 1, Math.ceil((hz(distance + 2 / columns) / nyquist) * spectrum.length));
    let peak = 0;
    for (let bin = from; bin < to && bin < spectrum.length; bin += 1) peak = Math.max(peak, spectrum[bin] ?? 0);
    // Treble is naturally much quieter than bass, so it gets a lift to reach the outer columns.
    return Math.min(1, ((peak / 255) * (1 + distance * 0.45)) ** 2.2);
  };

  const paint = (): void => {
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (columns === 0) return;
    const style = getComputedStyle(canvas);
    const played = style.color;
    const unplayed = style.getPropertyValue('--unplayed').trim();
    const playedColumns = Math.round(progress * columns);
    const cell = Math.max(1, Math.round(CELL * scale));

    for (let column = 0; column < columns; column += 1) {
      // While playing, one row always remains, so the position stays visible through quiet passages.
      const stack = Math.max(active ? 1 : 0, Math.round((heights[column] ?? 0) * rows));
      context.fillStyle = column < playedColumns ? played : unplayed;
      for (let row = 0; row < stack; row += 1) {
        const y = height - CELL - row * PITCH;
        context.fillRect(Math.round(column * PITCH * scale), Math.round(y * scale), cell, cell);
      }
    }
  };

  const tick = (): void => {
    if (analyser) analyser.getByteFrequencyData(spectrum);
    let moving = active;
    for (let column = 0; column < columns; column += 1) {
      const target = level(column);
      const now = heights[column] ?? 0;
      const next = now + (target - now) * (target > now ? RISE : FALL);
      heights[column] = next;
      if (Math.abs(target - next) > SETTLED) moving = true;
    }
    paint();
    frame = moving ? requestAnimationFrame(tick) : 0;
  };

  const animate = (): void => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const resize = (): void => {
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    scale = window.devicePixelRatio || 1;
    height = box.height;
    canvas.width = Math.round(box.width * scale);
    canvas.height = Math.round(height * scale);
    columns = Math.floor((box.width + GAP) / PITCH);
    rows = Math.floor((height + GAP) / PITCH);
    heights = new Float32Array(columns);
    paint();
  };

  new ResizeObserver(resize).observe(canvas);

  return {
    setProgress(next) {
      progress = next;
      if (!frame) paint();
    },
    play(source) {
      active = true;
      analyser = source;
      if (source) spectrum = new Uint8Array(source.frequencyBinCount);
      if (source) animate();
      else paint();
    },
    stop() {
      active = false;
      analyser = null;
      animate();
    },
  };
}
