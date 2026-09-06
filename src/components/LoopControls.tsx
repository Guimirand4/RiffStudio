import styles from './LoopControls.module.css';

interface LoopControlsProps {
  loopA: number | null;
  loopB: number | null;
  loopActive: boolean;
  currentBeat: number;
  totalBeats: number;
  isListening: boolean;
  onMarkA: () => void;
  onMarkB: () => void;
  onToggleLoop: () => void;
  onClearLoop: () => void;
}

/**
 * LoopControls — A-B repeat section controls.
 *
 * Workflow:
 *   1. Toque até o ponto de início desejado → "Marcar A"
 *   2. Continue até o ponto de fim → "Marcar B"
 *   3. "Ativar Loop" → cursor volta para A ao atingir B
 *   4. "Limpar" → remove o loop
 */
export function LoopControls({
  loopA,
  loopB,
  loopActive,
  currentBeat,
  totalBeats,
  isListening,
  onMarkA,
  onMarkB,
  onToggleLoop,
  onClearLoop,
}: LoopControlsProps) {
  const hasLoop = loopA !== null && loopB !== null;
  const progressA = loopA !== null && totalBeats > 0 ? (loopA / totalBeats) * 100 : null;
  const progressB = loopB !== null && totalBeats > 0 ? (loopB / totalBeats) * 100 : null;

  return (
    <div className={`${styles.container} ${loopActive ? styles.active : ''}`}>
      <div className={styles.header}>
        <span className={styles.label}>Loop A-B</span>
        {hasLoop && (
          <span className={styles.loopStatus}>
            Nota {(loopA ?? 0) + 1} → {(loopB ?? 0) + 1}
          </span>
        )}
      </div>

      {/* Visual mini progress bar showing A-B region */}
      {totalBeats > 0 && (
        <div className={styles.miniBar} role="presentation">
          <div className={styles.miniBarTrack}>
            {/* Current position */}
            <div
              className={styles.miniBarPosition}
              style={{ left: `${(currentBeat / totalBeats) * 100}%` }}
            />
            {/* A-B highlight region */}
            {progressA !== null && progressB !== null && (
              <div
                className={`${styles.miniBarRegion} ${loopActive ? styles.regionActive : ''}`}
                style={{
                  left: `${progressA}%`,
                  width: `${progressB - progressA}%`,
                }}
              />
            )}
            {/* A marker */}
            {progressA !== null && (
              <div className={styles.markerA} style={{ left: `${progressA}%` }}>
                A
              </div>
            )}
            {/* B marker */}
            {progressB !== null && (
              <div className={styles.markerB} style={{ left: `${progressB}%` }}>
                B
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className={styles.buttons}>
        <button
          id="loop-mark-a"
          className={`${styles.btn} ${styles.btnA} ${loopA !== null ? styles.marked : ''}`}
          onClick={onMarkA}
          disabled={!isListening}
          title="Marca o ponto de início do loop na nota atual"
        >
          {loopA !== null ? `A: ${loopA + 1}` : 'Marcar A'}
        </button>

        <button
          id="loop-mark-b"
          className={`${styles.btn} ${styles.btnB} ${loopB !== null ? styles.marked : ''}`}
          onClick={onMarkB}
          disabled={!isListening || loopA === null}
          title="Marca o ponto de fim do loop na nota atual (deve ser após A)"
        >
          {loopB !== null ? `B: ${loopB + 1}` : 'Marcar B'}
        </button>

        <button
          id="loop-toggle"
          className={`${styles.btn} ${styles.btnToggle} ${loopActive ? styles.btnToggleActive : ''}`}
          onClick={onToggleLoop}
          disabled={!hasLoop}
          title={loopActive ? 'Desativar repetição A-B' : 'Ativar repetição A-B'}
        >
          {loopActive ? '⏹ Stop Loop' : '🔁 Loop'}
        </button>

        {hasLoop && (
          <button
            id="loop-clear"
            className={`${styles.btn} ${styles.btnClear}`}
            onClick={onClearLoop}
            title="Remover marcações A e B"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
