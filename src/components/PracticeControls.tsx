import styles from './PracticeControls.module.css';

interface PracticeControlsProps {
  toleranceCents: number;
  onToleranceChange: (value: number) => void;
  isListening: boolean;
  onToggleListening: () => void;
  isLoading: boolean;
  sessionStats: {
    notesAttempted: number;
    notesCorrect: number;
    startTime: number | null;
    avgTimingMs: number;
  };
  onRestart: () => void;
}

export function PracticeControls({
  toleranceCents,
  onToleranceChange,
  isListening,
  onToggleListening,
  isLoading,
  sessionStats,
  onRestart,
}: PracticeControlsProps) {
  const accuracy = sessionStats.notesAttempted > 0
    ? Math.round((sessionStats.notesCorrect / sessionStats.notesAttempted) * 100)
    : null;

  const elapsedSec = sessionStats.startTime
    ? Math.floor((Date.now() - sessionStats.startTime) / 1000)
    : 0;
  const elapsedLabel = sessionStats.startTime
    ? `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`
    : '0:00';

  const avgMs = sessionStats.avgTimingMs;
  const timingLabel = avgMs === 0 ? '—' : avgMs > 0 ? `+${avgMs}ms` : `${avgMs}ms`;
  const timingClass = avgMs === 0 ? '' : Math.abs(avgMs) < 80 ? styles.good : Math.abs(avgMs) < 160 ? styles.warn : styles.poor;

  return (
    <div className={styles.container}>
      {/* Main action button */}
      <button
        id="toggle-listening"
        className={`btn ${isListening ? 'btn-danger' : 'btn-primary'} btn-lg ${styles.mainButton}`}
        onClick={onToggleListening}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18 }} />
            Iniciando microfone...
          </>
        ) : isListening ? (
          <>⏹ Parar Treino</>
        ) : (
          <>🎤 Começar Treino</>
        )}
      </button>

      {/* Session stats */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{sessionStats.notesCorrect}</span>
          <span className={styles.statLabel}>Acertos</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{sessionStats.notesAttempted}</span>
          <span className={styles.statLabel}>Tentativas</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${
            accuracy === null ? '' : accuracy >= 70 ? styles.good : styles.poor
          }`}>
            {accuracy !== null ? `${accuracy}%` : '—'}
          </span>
          <span className={styles.statLabel}>Precisão</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${timingClass}`}>{timingLabel}</span>
          <span className={styles.statLabel}>Timing</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{elapsedLabel}</span>
          <span className={styles.statLabel}>Tempo</span>
        </div>
      </div>

      {/* Tolerance control */}
      <div className={styles.toleranceSection}>
        <div className={styles.toleranceHeader}>
          <label htmlFor="tolerance-slider" className={styles.toleranceLabel}>
            Tolerância de Afinação
          </label>
          <span className={styles.toleranceValue}>±{toleranceCents}¢</span>
        </div>
        <input
          id="tolerance-slider"
          type="range"
          min={20}
          max={100}
          step={5}
          value={toleranceCents}
          onChange={(e) => onToleranceChange(Number(e.target.value))}
        />
        <div className={styles.toleranceHints}>
          <span>Rigoroso (20¢)</span>
          <span>Relaxado (100¢)</span>
        </div>
      </div>

      {/* Restart button */}
      {sessionStats.notesAttempted > 0 && (
        <button
          id="restart-session"
          className="btn btn-ghost"
          onClick={onRestart}
          style={{ fontSize: 'var(--text-sm)' }}
        >
          🔄 Reiniciar Sessão
        </button>
      )}
    </div>
  );
}
