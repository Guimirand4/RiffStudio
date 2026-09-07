/**
 * GuitarTuner.tsx
 *
 * Afinador de guitarra interativo em tempo real usando detecção de pitch por microfone (YIN algorithm via autocorrelation).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './GuitarTuner.module.css';

const STANDARD_TUNING: Array<{ string: number; name: string; freq: number }> = [
  { string: 1, name: 'e4', freq: 329.63 },
  { string: 2, name: 'B3', freq: 246.94 },
  { string: 3, name: 'G3', freq: 196.00 },
  { string: 4, name: 'D3', freq: 146.83 },
  { string: 5, name: 'A2', freq: 110.00 },
  { string: 6, name: 'E2', freq: 82.41 },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_COLORS = ['#A855F7', '#00D4FF', '#39ff14', '#FFD32A', '#FF9F43', '#FF4757'];

function freqToNoteName(freq: number): { note: string; octave: number; cents: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const noteIndex = ((rounded % 12) + 12 + 9) % 12; // A is index 9
  const octave = Math.floor((rounded + 9) / 12) + 4;
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

function nearestString(freq: number): { string: number; name: string; freq: number; cents: number } | null {
  if (freq <= 0) return null;
  let best = STANDARD_TUNING[0];
  let bestCents = Infinity;
  for (const s of STANDARD_TUNING) {
    const cents = 1200 * Math.log2(freq / s.freq);
    if (Math.abs(cents) < Math.abs(bestCents)) {
      bestCents = cents;
      best = s;
    }
  }
  return { ...best, cents: Math.round(bestCents) };
}

/** Simple autocorrelation pitch detection (YIN-lite) */
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // too quiet

  let lastCorrelation = 1;
  let foundGoodCorrelation = false;

  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      return sampleRate / bestOffset;
    }
    lastCorrelation = correlation;
  }
  if (bestOffset === -1) return -1;
  return sampleRate / bestOffset;
}

type TunerState = 'idle' | 'loading' | 'running' | 'error';

export function GuitarTuner() {
  const [tunerState, setTunerState] = useState<TunerState>('idle');
  const [detectedFreq, setDetectedFreq] = useState<number>(-1);
  const [error, setError] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const bufferRef = useRef<Float32Array | null>(null);

  const stopTuner = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setDetectedFreq(-1);
    setTunerState('idle');
  }, []);

  const startTuner = useCallback(async () => {
    setTunerState('loading');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      setTunerState('running');

      const loop = () => {
        if (!analyserRef.current || !bufferRef.current) return;
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);
        const freq = detectPitch(bufferRef.current, ctx.sampleRate);
        setDetectedFreq(freq);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao acessar o microfone');
      setTunerState('error');
    }
  }, []);

  useEffect(() => () => stopTuner(), [stopTuner]);

  const nearest = tunerState === 'running' ? nearestString(detectedFreq) : null;
  const noteInfo = detectedFreq > 0 ? freqToNoteName(detectedFreq) : null;
  const cents = nearest?.cents ?? 0;
  const inTune = Math.abs(cents) <= 5;
  const close = Math.abs(cents) <= 15;

  // Needle angle: -1.0 = far left (−50¢), 0 = center, +1.0 = far right (+50¢)
  const needleNorm = Math.max(-1, Math.min(1, cents / 50));
  const needleAngle = needleNorm * 60; // degrees, ±60°

  return (
    <div className={styles.tuner}>
      {/* String reference */}
      <div className={styles.strings}>
        {STANDARD_TUNING.map((s, i) => (
          <button
            key={s.string}
            className={`${styles.stringBtn} ${nearest?.string === s.string && tunerState === 'running' ? styles.stringActive : ''}`}
            style={{ '--string-color': STRING_COLORS[i] } as React.CSSProperties}
            title={`Corda ${s.string}: ${s.name} (${s.freq}Hz)`}
          >
            <span className={styles.stringNum}>{s.string}</span>
            <span className={styles.stringName}>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Meter dial */}
      <div className={styles.dial}>
        {/* Tick marks */}
        <svg className={styles.dialSvg} viewBox="0 0 220 130">
          {/* Arc background */}
          <path d="M 20 115 A 90 90 0 0 1 200 115" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
          {/* Green zone */}
          <path d="M 90 30 A 90 90 0 0 1 130 30" fill="none" stroke="rgba(57,255,20,0.3)" strokeWidth="16" strokeLinecap="round" />

          {/* Tick marks */}
          {Array.from({ length: 11 }, (_, i) => {
            const angle = -90 + i * 18;
            const rad = (angle * Math.PI) / 180;
            const cx = 110, cy = 115, r = 90;
            const x1 = cx + (r - 8) * Math.cos(rad);
            const y1 = cy + (r - 8) * Math.sin(rad);
            const x2 = cx + r * Math.cos(rad);
            const y2 = cy + r * Math.sin(rad);
            const isCenter = i === 5;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isCenter ? '#39ff14' : 'rgba(255,255,255,0.25)'}
                strokeWidth={isCenter ? 3 : 1.5} strokeLinecap="round" />
            );
          })}

          {/* Labels */}
          <text x="12" y="130" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">−50</text>
          <text x="110" y="22" fill="rgba(57,255,20,0.9)" fontSize="10" textAnchor="middle">0</text>
          <text x="208" y="130" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">+50</text>

          {/* Needle */}
          {tunerState === 'running' && (
            <g transform={`rotate(${needleAngle}, 110, 115)`}>
              <line x1="110" y1="115" x2="110" y2="30"
                stroke={inTune ? '#39ff14' : close ? '#FFD32A' : '#FF4757'}
                strokeWidth="3" strokeLinecap="round"
                style={{ transition: 'all 0.08s ease' }}
              />
              <circle cx="110" cy="115" r="5"
                fill={inTune ? '#39ff14' : close ? '#FFD32A' : '#FF4757'} />
            </g>
          )}
          {tunerState !== 'running' && (
            <line x1="110" y1="115" x2="110" y2="30"
              stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />
          )}
        </svg>

        {/* Center display */}
        <div className={styles.noteDisplay}>
          {tunerState === 'running' && noteInfo && detectedFreq > 0 ? (
            <>
              <span className={styles.detectedNote} style={{ color: inTune ? '#39ff14' : close ? '#FFD32A' : '#FF4757' }}>
                {noteInfo.note}{noteInfo.octave}
              </span>
              <span className={styles.centsDisplay} style={{ color: inTune ? '#39ff14' : close ? '#FFD32A' : '#FF4757' }}>
                {cents > 0 ? `+${cents}¢` : cents === 0 ? '0¢' : `${cents}¢`}
              </span>
              {nearest && (
                <span className={styles.targetNote}>→ corda {nearest.string} ({nearest.name})</span>
              )}
              {inTune && <span className={styles.inTuneLabel}>✓ Afinado!</span>}
            </>
          ) : tunerState === 'loading' ? (
            <span className={styles.statusLabel}>Abrindo microfone...</span>
          ) : tunerState === 'error' ? (
            <span className={styles.errorLabel}>{error}</span>
          ) : (
            <span className={styles.statusLabel}>Toque uma corda</span>
          )}
        </div>
      </div>

      {/* Action button */}
      <button
        className={`btn ${tunerState === 'running' ? 'btn-danger' : 'btn-primary'} ${styles.tunerBtn}`}
        onClick={tunerState === 'running' ? stopTuner : startTuner}
        disabled={tunerState === 'loading'}
      >
        {tunerState === 'running' ? '⏹ Parar Afinador' : tunerState === 'loading' ? '...' : '🎙 Iniciar Afinador'}
      </button>

      <p className={styles.tunerHint}>
        Toque cada corda solta e ajuste as cravelhas até o ponteiro centralizar no verde.
      </p>
    </div>
  );
}
