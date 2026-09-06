import { useEffect, useRef, useState } from 'react';
import styles from './InputLevelMeter.module.css';

// RMS thresholds
const GOOD_MIN = 0.01;   // minimum useful signal level
const CLIP_MAX = 0.9;    // above this = likely clipping

type SignalStatus = 'silent' | 'low' | 'good' | 'high';

/**
 * InputLevelMeter — real-time VU meter showing microphone input level.
 *
 * Helps diagnose "not detecting" problems:
 *   🔴 Silent → mic not picking up signal (too far, wrong input device)
 *   🟡 Low    → signal too weak (move mic closer, raise system input gain)
 *   🟢 Good   → optimal range for pitch detection
 *   🔴 High   → clipping risk (too close to mic, input gain too high)
 */
export function InputLevelMeter() {
  const [rms, setRms] = useState(0);
  const [peak, setPeak] = useState(0);
  const peakHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peakRef = useRef(0);

  useEffect(() => {
    const handleLevel = (e: CustomEvent<{ rms: number }>) => {
      const level = e.detail.rms;
      setRms(level);

      // Peak hold: update peak if higher, hold for 1.5s then decay
      if (level > peakRef.current) {
        peakRef.current = level;
        setPeak(level);
        if (peakHoldTimer.current) clearTimeout(peakHoldTimer.current);
        peakHoldTimer.current = setTimeout(() => {
          peakRef.current = 0;
          setPeak(0);
        }, 1500);
      }
    };

    window.addEventListener('inputLevel', handleLevel);
    return () => {
      window.removeEventListener('inputLevel', handleLevel);
      if (peakHoldTimer.current) clearTimeout(peakHoldTimer.current);
    };
  }, []);

  // Clamp and scale RMS for display (log-like scaling for better visual response)
  const displayLevel = Math.min(1, Math.sqrt(rms / 0.5));
  const displayPeak = Math.min(1, Math.sqrt(peak / 0.5));

  const status: SignalStatus =
    rms < 0.001 ? 'silent' :
    rms < GOOD_MIN ? 'low' :
    rms > CLIP_MAX ? 'high' :
    'good';

  const statusConfig = {
    silent: { label: 'Silêncio — toque a guitarra', color: 'var(--text-muted)', icon: '🔇' },
    low:    { label: 'Sinal fraco — aproxime o microfone', color: '#f59e0b', icon: '⚠️' },
    good:   { label: 'Nível OK — pronto para detectar', color: 'var(--note-correct)', icon: '✓' },
    high:   { label: 'Sinal alto demais — reduza o ganho', color: 'var(--note-wrong)', icon: '⚡' },
  };

  const cfg = statusConfig[status];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Entrada de Áudio</span>
        <span className={styles.status} style={{ color: cfg.color }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Meter bar */}
      <div className={styles.meterTrack} role="meter" aria-label="Nível de entrada">
        {/* Colored zones: green 0–70%, yellow 70–90%, red 90–100% */}
        <div className={styles.zoneGreen} />
        <div className={styles.zoneYellow} />
        <div className={styles.zoneRed} />

        {/* Level fill */}
        <div
          className={styles.levelFill}
          style={{ width: `${displayLevel * 100}%` }}
        />

        {/* Peak hold marker */}
        {displayPeak > 0 && (
          <div
            className={`${styles.peakMarker} ${status === 'high' ? styles.peakRed : ''}`}
            style={{ left: `${displayPeak * 100}%` }}
          />
        )}
      </div>

      {/* dB-like scale labels */}
      <div className={styles.scaleLabels}>
        <span>-∞</span>
        <span>-20</span>
        <span>-12</span>
        <span>-6</span>
        <span>0 dB</span>
      </div>
    </div>
  );
}
