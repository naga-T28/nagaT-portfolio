import { formatTime } from '../lib/format';
import { createWaveform } from './waveform';

const VOLUME_KEY = 'naga:volume';
const MUTED_KEY = 'naga:muted';
const LOOP_KEY = 'naga:loop';
const DEFAULT_VOLUME = 0.7;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The setting still applies to this page view.
  }
}

/** Plays only after a click. The file is not downloaded until then (preload="none"). */
export function initSound(): void {
  const bar = document.querySelector<HTMLElement>('[data-sound]');
  const audio = bar?.querySelector<HTMLAudioElement>('[data-sound-audio]');
  const toggle = bar?.querySelector<HTMLButtonElement>('[data-sound-toggle]');
  const seek = bar?.querySelector<HTMLInputElement>('[data-sound-seek]');
  const canvas = bar?.querySelector<HTMLCanvasElement>('[data-sound-wave]');
  const current = bar?.querySelector<HTMLElement>('[data-sound-current]');
  const total = bar?.querySelector<HTMLElement>('[data-sound-total]');
  const status = bar?.querySelector<HTMLElement>('[data-sound-status]');
  const mute = bar?.querySelector<HTMLButtonElement>('[data-sound-mute]');
  const volume = bar?.querySelector<HTMLInputElement>('[data-sound-volume]');
  const loop = bar?.querySelector<HTMLButtonElement>('[data-sound-loop]');
  if (!bar || !audio || !toggle || !seek || !canvas || !current || !total || !status || !mute || !volume || !loop) return;

  const title = bar.dataset.title ?? '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = (): number => (Number.isFinite(audio.duration) ? audio.duration : Number(seek.max));
  const waveform = createWaveform(canvas);

  const savedLevel = Number(read(VOLUME_KEY));
  let level = read(VOLUME_KEY) !== null && savedLevel >= 0 && savedLevel <= 1 ? savedLevel : DEFAULT_VOLUME;
  let muted = read(MUTED_KEY) === '1';

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let gain: GainNode | null = null;

  const renderTime = (time: number): void => {
    current.textContent = formatTime(time);
    seek.value = String(Math.floor(time));
    seek.setAttribute('aria-valuetext', `${formatTime(time)} / ${formatTime(duration())}`);
    waveform.setProgress(time / duration());
  };

  const renderPlaying = (): void => {
    bar.toggleAttribute('data-playing', !audio.paused);
    toggle.setAttribute('aria-label', (audio.paused ? bar.dataset.playLabel : bar.dataset.pauseLabel) ?? title);
  };

  const applyVolume = (): void => {
    const output = muted ? 0 : level;
    const percent = Math.round(level * 100);
    if (gain) {
      gain.gain.value = output;
    } else {
      audio.volume = level;
      audio.muted = muted;
    }
    bar.dataset.gain = String(output);
    bar.toggleAttribute('data-muted', output === 0);
    mute.setAttribute('aria-label', (output === 0 ? bar.dataset.unmuteLabel : bar.dataset.muteLabel) ?? '');
    volume.value = String(level);
    volume.style.setProperty('--level', `${percent}%`);
    volume.setAttribute('aria-valuetext', `${percent}%`);
  };

  const applyLoop = (on: boolean): void => {
    audio.loop = on;
    loop.setAttribute('aria-pressed', String(on));
  };

  /**
   * Routes the sound through an analyser for the waveform, then a gain node for the volume. The
   * analyser comes first so turning the volume down does not shrink the waves, and gain also works
   * on iOS, which ignores audio.volume. Without Web Audio the track still plays normally.
   */
  const connectAudioGraph = (): void => {
    if (audioContext || typeof AudioContext === 'undefined') return;
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      gain = audioContext.createGain();
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(audioContext.destination);
      audio.volume = 1;
      audio.muted = false;
      applyVolume();
    } catch {
      analyser = null;
      gain = null;
    }
  };

  toggle.addEventListener('click', () => {
    status.textContent = '';
    if (audio.paused) {
      connectAudioGraph();
      void audioContext?.resume();
      // The browser reports failures through the 'error' event below as well.
      audio.play().catch(() => renderPlaying());
    } else {
      audio.pause();
    }
  });

  seek.addEventListener('input', () => {
    audio.currentTime = Number(seek.value);
    renderTime(Number(seek.value));
  });

  volume.addEventListener('input', () => {
    level = Number(volume.value);
    muted = false;
    write(VOLUME_KEY, String(level));
    write(MUTED_KEY, '0');
    applyVolume();
  });

  mute.addEventListener('click', () => {
    if (level === 0) {
      level = DEFAULT_VOLUME;
      muted = false;
    } else {
      muted = !muted;
    }
    write(VOLUME_KEY, String(level));
    write(MUTED_KEY, muted ? '1' : '0');
    applyVolume();
  });

  loop.addEventListener('click', () => {
    const on = !audio.loop;
    applyLoop(on);
    write(LOOP_KEY, on ? '1' : '0');
  });

  audio.addEventListener('play', () => {
    renderPlaying();
    waveform.play(reducedMotion.matches ? null : analyser);
  });
  audio.addEventListener('pause', () => {
    renderPlaying();
    waveform.stop();
  });
  audio.addEventListener('timeupdate', () => renderTime(audio.currentTime));
  audio.addEventListener('loadedmetadata', () => {
    seek.max = String(Math.floor(audio.duration));
    total.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    renderTime(0);
    renderPlaying();
    waveform.stop();
  });
  audio.addEventListener('error', () => {
    status.textContent = bar.dataset.errorText ?? '';
    renderPlaying();
    waveform.stop();
  });

  applyVolume();
  applyLoop(read(LOOP_KEY) === '1');
  renderTime(0);

  // The title shows on phone lock screens and in OS media controls.
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: bar.dataset.artist ?? '' });
  }
}
