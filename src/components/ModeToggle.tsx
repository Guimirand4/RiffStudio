/**
 * ModeToggle.tsx
 *
 * Pill-shaped toggle button to switch between "Tablatura" and "Arcade" views.
 * Persists the user's preference in localStorage so it survives page reloads.
 *
 * Disabled when the score isn't loaded yet (arcade mode requires the timeline).
 */

export type ViewMode = 'tab' | 'arcade';
export type PlayMode = 'practice' | 'music';

const VIEW_STORAGE_KEY = 'riffstudio-view-mode';
const PLAY_STORAGE_KEY = 'riffstudio-play-mode';

export function loadViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'tab' || saved === 'arcade') return saved;
  } catch { }
  return 'tab';
}

export function saveViewMode(mode: ViewMode): void {
  try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch { }
}

export function loadPlayMode(): PlayMode {
  try {
    const saved = localStorage.getItem(PLAY_STORAGE_KEY);
    if (saved === 'practice' || saved === 'music') return saved;
  } catch { }
  return 'practice';
}

export function savePlayMode(mode: PlayMode): void {
  try { localStorage.setItem(PLAY_STORAGE_KEY, mode); } catch { }
}

interface ModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** Disable the Arcade option until the score has loaded its timeline. */
  arcadeReady: boolean;
}

import styles from './ModeToggle.module.css';

export function ModeToggle({ mode, onChange, arcadeReady }: ModeToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label="Modo de visualização">
      <button
        id="mode-tab"
        className={`${styles.btn} ${mode === 'tab' ? styles.active : ''}`}
        onClick={() => onChange('tab')}
        aria-pressed={mode === 'tab'}
        title="Visualização em tablatura tradicional"
      >
        🎵 Tablatura
      </button>
      <button
        id="mode-arcade"
        className={`${styles.btn} ${mode === 'arcade' ? styles.active : ''} ${!arcadeReady ? styles.disabled : ''}`}
        onClick={() => arcadeReady && onChange('arcade')}
        aria-pressed={mode === 'arcade'}
        aria-disabled={!arcadeReady}
        title={arcadeReady ? 'Modo Arcade — pista de notas estilo Guitar Hero' : 'Carregando...'}
      >
        🎮 Arcade
      </button>
    </div>
  );
}

interface PlayModeToggleProps {
  mode: PlayMode;
  onChange: (mode: PlayMode) => void;
}

export function PlayModeToggle({ mode, onChange }: PlayModeToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label="Modo de treino">
      <button
        className={`${styles.btn} ${mode === 'practice' ? styles.active : ''}`}
        onClick={() => onChange('practice')}
        aria-pressed={mode === 'practice'}
        title="Modo Prática — no seu tempo, sem pressão"
      >
        🐢 Prática
      </button>
      <button
        className={`${styles.btn} ${mode === 'music' ? styles.active : ''}`}
        onClick={() => onChange('music')}
        aria-pressed={mode === 'music'}
        title="Modo Música — tempo real, playback ativo"
      >
        🔥 Música
      </button>
    </div>
  );
}
