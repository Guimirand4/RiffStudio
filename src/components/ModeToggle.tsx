/**
 * ModeToggle.tsx
 *
 * Pill-shaped toggle button to switch between "Tablatura" and "Arcade" views.
 * Persists the user's preference in localStorage so it survives page reloads.
 *
 * Disabled when the score isn't loaded yet (arcade mode requires the timeline).
 */

export type ViewMode = 'tab' | 'arcade';

const STORAGE_KEY = 'riffstudio-view-mode';

export function loadViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'tab' || saved === 'arcade') return saved;
  } catch {
    // localStorage unavailable (private browsing, Tauri sandbox edge case)
  }
  return 'tab'; // default
}

export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
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
