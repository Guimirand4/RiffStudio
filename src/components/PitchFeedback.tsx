import { useState, useEffect, useRef } from 'react';
import type { DetectedNote } from '../audio/pitchDetector';
import styles from './PitchFeedback.module.css';

type NoteState = 'idle' | 'detected' | 'correct' | 'wrong';

interface PitchFeedbackProps {
  expectedNote?: string | null;   // e.g. "E2" — null when not in game mode
  onCorrectNote?: () => void;
  toleranceCents?: number;
}

export function PitchFeedback({ expectedNote, onCorrectNote, toleranceCents = 50 }: PitchFeedbackProps) {
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);
  const [noteState, setNoteState] = useState<NoteState>('idle');
  const [lastCorrect, setLastCorrect] = useState<string | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleNoteDetected = (e: CustomEvent<DetectedNote>) => {
      const detected = e.detail;
      setCurrentNote(detected);

      // Clear silence timer
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      // Set to idle after 400ms of silence
      silenceTimer.current = setTimeout(() => {
        setCurrentNote(null);
        setNoteState('idle');
      }, 400);

      if (expectedNote) {
        // Game mode: check against expected note
        const expectedMidi = noteNameToMidi(expectedNote);
        const pitchClassMatch = Math.abs(detected.midiNumber - expectedMidi) % 12 === 0;
        const centsOk = Math.abs(detected.cents) <= toleranceCents;

        if (pitchClassMatch && centsOk) {
          setNoteState('correct');
          setLastCorrect(detected.noteName);
          onCorrectNote?.();
        } else {
          setNoteState('wrong');
        }
      } else {
        // Listen mode: just show the detected note
        setNoteState('detected');
      }
    };

    window.addEventListener('noteDetected', handleNoteDetected);
    return () => {
      window.removeEventListener('noteDetected', handleNoteDetected);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, [expectedNote, toleranceCents, onCorrectNote]);

  const centsBar = currentNote ? Math.max(-50, Math.min(50, currentNote.cents)) : 0;
  const centsPercent = ((centsBar + 50) / 100) * 100;

  return (
    <div className={`${styles.container} ${styles[noteState]}`}>
      {/* Note name display */}
      <div className={styles.noteDisplay}>
        <span className={styles.noteLabel}>
          {currentNote ? currentNote.noteName : (expectedNote ? '—' : '🎤')}
        </span>
        {currentNote && (
          <span className={styles.clarity}>
            {Math.round(currentNote.clarity * 100)}% clara
          </span>
        )}
      </div>

      {/* Cents tuning meter */}
      <div className={styles.centsContainer}>
        <span className={styles.centsLabel}>♭</span>
        <div className={styles.centsTrack}>
          <div className={styles.centerLine} />
          <div
            className={styles.centsIndicator}
            style={{ left: `${centsPercent}%` }}
          />
        </div>
        <span className={styles.centsLabel}>♯</span>
        {currentNote && (
          <span className={styles.centsValue}>
            {currentNote.cents > 0 ? '+' : ''}{currentNote.cents}¢
          </span>
        )}
      </div>

      {/* Status badge */}
      <div className={styles.statusBadge}>
        {noteState === 'correct' && (
          <span className={`badge badge-correct ${styles.badgeCorrect}`}>
            ✓ ACERTOU
          </span>
        )}
        {noteState === 'wrong' && (
          <span className={`badge badge-wrong ${styles.badgeWrong}`}>
            ✗ ERROU
          </span>
        )}
        {noteState === 'detected' && (
          <span className={`badge badge-accent`}>
            🎵 {currentNote?.noteName}
          </span>
        )}
        {noteState === 'idle' && (
          <span className={`badge badge-pending`}>
            ⏳ Aguardando...
          </span>
        )}
      </div>

      {/* Expected note hint (game mode) */}
      {expectedNote && noteState !== 'correct' && (
        <div className={styles.expectedHint}>
          Toque: <span className={styles.expectedNote}>{expectedNote}</span>
        </div>
      )}
    </div>
  );
}

// Inline helper (avoids circular import with noteUtils)
function noteNameToMidi(noteName: string): number {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const normalized = noteName
    .replace('Bb', 'A#').replace('Eb', 'D#')
    .replace('Ab', 'G#').replace('Db', 'C#').replace('Gb', 'F#');
  const match = normalized.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 0;
  const noteIndex = NOTE_NAMES.indexOf(match[1]);
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + noteIndex;
}
