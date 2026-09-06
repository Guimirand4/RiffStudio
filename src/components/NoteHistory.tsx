import { useEffect, useRef, useState } from 'react';
import type { DetectedNote } from '../audio/pitchDetector';
import styles from './NoteHistory.module.css';

interface NoteEntry {
  note: string;
  correct: boolean;
  timestamp: number;
}

const MAX_ENTRIES = 20;

interface NoteHistoryProps {
  expectedNote?: string | null;
  toleranceCents?: number;
}

export function NoteHistory({ expectedNote, toleranceCents = 50 }: NoteHistoryProps) {
  const [history, setHistory] = useState<NoteEntry[]>([]);
  const lastNoteRef = useRef<string | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const DEBOUNCE_MS = 300; // avoid recording the same sustained note multiple times

  useEffect(() => {
    const handleNote = (e: CustomEvent<DetectedNote>) => {
      const detected = e.detail;
      const now = performance.now();

      // Debounce: skip if same note detected within debounce window
      if (
        detected.noteName === lastNoteRef.current &&
        now - lastTimestampRef.current < DEBOUNCE_MS
      ) return;

      lastNoteRef.current = detected.noteName;
      lastTimestampRef.current = now;

      let correct = false;
      if (expectedNote) {
        const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const norm = (n: string) => n.replace('Bb','A#').replace('Eb','D#').replace('Ab','G#').replace('Db','C#').replace('Gb','F#');
        const parseMidi = (name: string) => {
          const m = norm(name).match(/^([A-G]#?)(\d+)$/);
          if (!m) return 0;
          return (parseInt(m[2]) + 1) * 12 + NOTE_NAMES.indexOf(m[1]);
        };
        const expectedMidi = parseMidi(expectedNote);
        const detectedMidi = detected.midiNumber;
        correct = (Math.abs(detectedMidi - expectedMidi) % 12 === 0) && (Math.abs(detected.cents) <= toleranceCents);
      }

      setHistory((prev) => {
        const next = [...prev, { note: detected.noteName, correct, timestamp: now }];
        return next.slice(-MAX_ENTRIES);
      });
    };

    window.addEventListener('noteDetected', handleNote);
    return () => window.removeEventListener('noteDetected', handleNote);
  }, [expectedNote, toleranceCents]);

  const correctCount = history.filter((e) => e.correct).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Histórico</span>
        {accuracy !== null && (
          <span className={`${styles.accuracy} ${accuracy >= 70 ? styles.good : styles.poor}`}>
            {accuracy}% acerto
          </span>
        )}
      </div>

      <div className={styles.bars}>
        {Array.from({ length: MAX_ENTRIES }).map((_, i) => {
          const entry = history[i - (MAX_ENTRIES - history.length)];
          if (!entry || i < MAX_ENTRIES - history.length) {
            return <div key={i} className={`${styles.bar} ${styles.empty}`} />;
          }
          return (
            <div
              key={i}
              className={`${styles.bar} ${entry.correct ? styles.correct : styles.wrong}`}
              title={`${entry.note} — ${entry.correct ? 'Correto' : 'Errado'}`}
            />
          );
        })}
      </div>

      {history.length === 0 && (
        <p className={styles.emptyLabel}>Comece a tocar para ver o histórico</p>
      )}
    </div>
  );
}
