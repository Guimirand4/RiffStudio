/**
 * NoteHighway.tsx
 *
 * Canvas-based "Guitar Hero / Yousician" style visualizer.
 * Redesigned for a sleek, compact 3D-ish feel.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { BeatStringNote } from '../lib/beatTimeline';
import type { MatchResult } from '../lib/noteMatcher';
import styles from './NoteHighway.module.css';

export interface HitFeedback {
  id: number;
  correct: boolean;
  timingMs: number;
  strings: number[];
  matchResult: MatchResult;
}

interface NoteHighwayProps {
  timeline: BeatStringNote[];
  currentBeatIndex: number;
  bpm: number;
  isActive: boolean;
  lastHit: HitFeedback | null;
  playbackPositionMs: number;
}

const NUM_STRINGS = 6;
const LABEL_WIDTH = 48;
const HIT_LINE_OFFSET = 70;
const HIT_LINE_X = LABEL_WIDTH + HIT_LINE_OFFSET;
const NOTE_RADIUS = 16;
const FLASH_DURATION_MS = 600;

/** How many beats to show ahead of the hit line. Controls visual density. */
const LOOKAHEAD_BEATS = 6;

/** Standard tab order: 1 (high e) at top, 6 (low E) at bottom. */
const STRING_ORDER = [1, 2, 3, 4, 5, 6] as const;

const STRING_LABEL: Record<number, string> = {
  1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E',
};

/** Yousician-inspired bright colors */
const STRING_COLOR: Record<number, string> = {
  1: '#A855F7', // e - purple
  2: '#00D4FF', // B - cyan
  3: '#39ff14', // G - green
  4: '#FFD32A', // D - yellow
  5: '#FF9F43', // A - orange
  6: '#FF4757', // E - red
};

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FlashState {
  stringNumber: number;
  color: string;
  label: string;
  startTime: number;
}

export function NoteHighway({
  timeline,
  currentBeatIndex,
  bpm,
  isActive,
  lastHit,
  playbackPositionMs,
}: NoteHighwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashesRef = useRef<FlashState[]>([]);
  const rafRef = useRef<number>(0);

  // Stable refs for RAF loop
  const timelineRef = useRef(timeline);
  const currentBeatRef = useRef(currentBeatIndex);
  const bpmRef = useRef(bpm);
  const isActiveRef = useRef(isActive);
  const playbackPositionMsRef = useRef(playbackPositionMs);

  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => { currentBeatRef.current = currentBeatIndex; }, [currentBeatIndex]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { playbackPositionMsRef.current = playbackPositionMs; }, [playbackPositionMs]);

  // ── Flash trigger ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastHit) return;

    const label = lastHit.correct
      ? lastHit.timingMs < 80
        ? 'Perfect! ✨'
        : lastHit.timingMs < 160
        ? 'Bom! 👍'
        : 'OK'
      : 'Errou!';

    const flashColor = lastHit.correct
      ? lastHit.timingMs < 80
        ? '#39ff14'
        : '#ffd32a'
      : '#ff4757';

    const stringsToFlash = lastHit.strings.length > 0 ? lastHit.strings : [6];

    const newFlashes: FlashState[] = stringsToFlash.map((s) => ({
      stringNumber: s,
      color: flashColor,
      label,
      startTime: performance.now(),
    }));

    flashesRef.current = [...flashesRef.current, ...newFlashes];
  }, [lastHit]);

  // ── Canvas render ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timeline = timelineRef.current;
    const currentBeatIdx = currentBeatRef.current;
    const bpm = bpmRef.current;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    // ── Layout Geometry ──
    const NECK_HEIGHT = 220; // bigger neck so strings are easier to read
    const NECK_TOP = H - NECK_HEIGHT - 20;
    const LANE_H = NECK_HEIGHT / NUM_STRINGS;

    // DPR-aware clear
    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Neck background subtle tint
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, NECK_TOP - 10, W, NECK_HEIGHT + 20);

    const laneY = (s: number) => {
      const idx = STRING_ORDER.indexOf(s as typeof STRING_ORDER[number]);
      return NECK_TOP + idx * LANE_H + LANE_H / 2;
    };

    // ── Strings and Labels ──────────────────────────────────────────────────────
    STRING_ORDER.forEach((s) => {
      const y = laneY(s);

      // String line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();

      // String core (inner highlight)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();

      // Label
      const color = STRING_COLOR[s];
      ctx.fillStyle = color;
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(STRING_LABEL[s], LABEL_WIDTH / 2, y);
    });

    // ── Hit line ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(HIT_LINE_X, NECK_TOP - 20);
    ctx.lineTo(HIT_LINE_X, NECK_TOP + NECK_HEIGHT + 20);
    ctx.stroke();

    // Hit line glow
    const glowGrad = ctx.createLinearGradient(HIT_LINE_X - 20, 0, HIT_LINE_X + 20, 0);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(HIT_LINE_X - 20, NECK_TOP - 20, 40, NECK_HEIGHT + 40);

    // ── Compute px/ms ──────────────────────────────────────────────────────────
    const quarterMs = 60_000 / bpm;
    const lookaheadMs = LOOKAHEAD_BEATS * quarterMs;
    const availableWidth = W - HIT_LINE_X - 16;
    const pxPerMs = availableWidth / lookaheadMs;

    const currentTimeMs = playbackPositionMsRef.current;
    const MIN_X = LABEL_WIDTH - 200; // allow long pills to pass off-screen safely
    const MAX_X = W + 200;

    const visibleBeats = timeline.filter((beat) => {
      if (beat.isRest) return false;
      const x = HIT_LINE_X + (beat.timePositionMs - currentTimeMs) * pxPerMs;
      return x >= MIN_X && x <= MAX_X;
    });

    // ── Draw Notes (Pills) ──────────────────────────────────────────────────────
    visibleBeats.forEach((beat) => {
      const x = HIT_LINE_X + (beat.timePositionMs - currentTimeMs) * pxPerMs;
      const isPast = beat.beatIndex < currentBeatIdx;
      const isCurrent = beat.beatIndex === currentBeatIdx;

      // Note duration width — cap to 80% of time gap to next note to prevent overlap
      const rawWidth = beat.durationMs * pxPerMs;
      // Find next non-rest beat to compute gap
      const nextBeat = timeline.slice(beat.beatIndex + 1).find(b => !b.isRest);
      const maxWidth = nextBeat
        ? (nextBeat.timePositionMs - beat.timePositionMs) * pxPerMs * 0.80
        : rawWidth;
      const pillWidth = Math.max(NOTE_RADIUS * 2, Math.min(rawWidth, maxWidth));
      
      beat.notes.forEach((note) => {
        const y = laneY(note.stringNumber);
        const color = STRING_COLOR[note.stringNumber];
        const alpha = isPast ? 0.2 : isCurrent ? 1.0 : 0.85;

        ctx.save();
        ctx.globalAlpha = alpha;

        const rightArcX = x + pillWidth - NOTE_RADIUS * 2;

        // Draw pill shape
        ctx.fillStyle = color;
        ctx.beginPath();
        // Left half-circle
        ctx.arc(x, y, NOTE_RADIUS, Math.PI / 2, Math.PI * 1.5);
        // Top edge
        ctx.lineTo(rightArcX, y - NOTE_RADIUS);
        // Right half-circle
        ctx.arc(rightArcX, y, NOTE_RADIUS, Math.PI * 1.5, Math.PI / 2);
        // Bottom edge
        ctx.closePath();
        ctx.fill();

        // Highlight stroke if current
        if (isCurrent) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Subtle glow
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Fret number text — drawn at pill's left arc center (the hit position)
        ctx.globalAlpha = Math.max(alpha, 0.6);
        ctx.fillStyle = '#000'; // always black for contrast on neon
        ctx.font = `bold 15px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(note.fret), x, y);

        ctx.restore();
      });
    });

    // ── Flash overlays ──────────────────────────────────────────────────────────
    const now = performance.now();
    flashesRef.current = flashesRef.current.filter(
      (f) => now - f.startTime < FLASH_DURATION_MS,
    );

    flashesRef.current.forEach((flash) => {
      const elapsed = now - flash.startTime;
      const t = elapsed / FLASH_DURATION_MS;
      const flashAlpha = Math.max(0, 1 - t) * 0.7;
      const labelAlpha = Math.max(0, 1 - t * 2.5);

      const y = laneY(flash.stringNumber);

      ctx.save();
      
      // Hit flash explosion
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flash.color;
      ctx.beginPath();
      ctx.arc(HIT_LINE_X, y, NOTE_RADIUS * 2.5 + (t * 20), 0, Math.PI * 2);
      ctx.fill();

      // Floating label
      const labelY = y - t * 25 - 15;
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = '#fff';
      ctx.font = '900 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = flash.color;
      ctx.shadowBlur = 10;
      ctx.fillText(flash.label, HIT_LINE_X, labelY);
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    // ── Idle overlay — only shown when there are no notes to see ────────────
    if (!isActiveRef.current && timelineRef.current.length === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.8)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Clique em Tocar Música ou Começar Treino', W / 2, H / 2 - 20);
      ctx.restore();
    }
  }, []);

  // ── RAF loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── Resize handling ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
    };

    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={styles.highway}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

