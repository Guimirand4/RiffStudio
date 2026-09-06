/**
 * NoteHighway.tsx
 *
 * Canvas-based "Guitar Hero / Yousician" style visualizer.
 *
 * Layout (horizontal scroll, right → left):
 *
 *  String 6 (E2) ━━━━━━━━━━━━━●━━━━━━━━━━━━●━━━━ |
 *  String 5 (A2) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
 *  String 4 (D3) ━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━ |
 *  String 3 (G3) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
 *  String 2 (B3) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
 *  String 1  (e4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
 *                                                  ↑
 *                                          Hit line (fixed)
 *
 * Clock model: PLAYER-DRIVEN (Option A).
 * The current expected beat is always anchored to the hit line.
 * Notes don't scroll in real-time — they advance when the player hits a note.
 * This matches the existing tablature mode philosophy.
 *
 * Feedback system:
 * - Receives `lastHit` prop from Player (updated on every noteOnset).
 * - Triggers per-lane flash animation with label "Perfect! ✨", "Bom! 👍" or "Errou!".
 * - Flash fades out over ~700ms via requestAnimationFrame.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { BeatStringNote } from '../lib/beatTimeline';
import type { MatchResult } from '../lib/noteMatcher';
import styles from './NoteHighway.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HitFeedback {
  /** Monotonically increasing ID — ensures identical results still trigger effects. */
  id: number;
  correct: boolean;
  timingMs: number;
  /** Strings active in the beat that was attempted (for coloring the flash). */
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

// ─── Visual constants ─────────────────────────────────────────────────────────

const NUM_STRINGS = 6;
const LABEL_WIDTH = 72;          // px reserved for string labels on the left
const HIT_LINE_OFFSET = 30;     // extra px between label area and hit line
const HIT_LINE_X = LABEL_WIDTH + HIT_LINE_OFFSET;  // x of the hit line
const NOTE_RADIUS = 15;
const FLASH_DURATION_MS = 700;

/** How many beats to show ahead of the hit line. Controls visual density. */
const LOOKAHEAD_BEATS = 5;

/** String 6 at top, string 1 at bottom — mirrors guitar orientation in hands. */
const STRING_ORDER = [6, 5, 4, 3, 2, 1] as const;

/** Note names for string labels. */
const STRING_LABEL: Record<number, string> = {
  6: 'E', 5: 'A', 4: 'D', 3: 'G', 2: 'B', 1: 'e',
};

/** Vibrant neon colors per string — warms (bass) to cools (treble). */
const STRING_COLOR: Record<number, string> = {
  6: '#FF4757', // E2 — neon red
  5: '#FF9F43', // A2 — orange
  4: '#FFD32A', // D3 — yellow
  3: '#39ff14', // G3 — neon green (matches RiffStudio accent)
  2: '#00D4FF', // B3 — cyan
  1: '#A855F7', // e4 — purple
};

/** Dim version of each string color for lane backgrounds. */
const STRING_LANE_BG: Record<number, string> = {
  6: 'rgba(255, 71, 87, 0.04)',
  5: 'rgba(255, 159, 67, 0.04)',
  4: 'rgba(255, 211, 42, 0.04)',
  3: 'rgba(57, 255, 20, 0.04)',
  2: 'rgba(0, 212, 255, 0.04)',
  1: 'rgba(168, 85, 247, 0.04)',
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

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Stable refs to avoid stale closures in the RAF loop
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

    // Flash all strings that were in the beat (correct), or all active strings (wrong)
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
    const W = canvas.width;
    const H = canvas.height;
    const LANE_H = H / NUM_STRINGS;

    // DPR-aware clear
    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Helper: center Y of a lane for a given string number
    const laneY = (s: number) => {
      const idx = STRING_ORDER.indexOf(s as typeof STRING_ORDER[number]);
      return idx * LANE_H + LANE_H / 2;
    };

    // ── Lane backgrounds and labels ─────────────────────────────────────────────
    STRING_ORDER.forEach((s) => {
      const y = laneY(s);
      const top = y - LANE_H / 2;

      // Lane tint
      ctx.fillStyle = STRING_LANE_BG[s];
      ctx.fillRect(0, top, W, LANE_H);

      // Lane separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(W, top);
      ctx.stroke();

      // Label area background
      ctx.fillStyle = 'rgba(10,10,15,0.9)';
      ctx.fillRect(0, top, LABEL_WIDTH, LANE_H);

      // String number + note name
      const color = STRING_COLOR[s];
      ctx.fillStyle = color;
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${s}  ${STRING_LABEL[s]}`, LABEL_WIDTH / 2, y);
    });

    // ── Hit line ──────────────────────────────────────────────────────────────────
    // Glow behind the hit line
    const glowGrad = ctx.createLinearGradient(HIT_LINE_X - 20, 0, HIT_LINE_X + 20, 0);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(HIT_LINE_X - 20, 0, 40, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HIT_LINE_X, 0);
    ctx.lineTo(HIT_LINE_X, H);
    ctx.stroke();

    // ── Compute px/ms for this BPM ───────────────────────────────────────────────
    const quarterMs = 60_000 / bpm;
    const lookaheadMs = LOOKAHEAD_BEATS * quarterMs;
    const availableWidth = W - HIT_LINE_X - 16;
    const pxPerMs = availableWidth / lookaheadMs;

    // ── Note positions ────────────────────────────────────────────────────────────
    const currentTimeMs = playbackPositionMsRef.current;

    const MIN_X = LABEL_WIDTH - NOTE_RADIUS * 3;
    const MAX_X = W + NOTE_RADIUS;

    // Draw in two passes: past first (so current overlays them)
    const visibleBeats = timeline.filter((beat) => {
      if (beat.isRest) return false;
      const x = HIT_LINE_X + (beat.timePositionMs - currentTimeMs) * pxPerMs;
      return x >= MIN_X && x <= MAX_X;
    });

    visibleBeats.forEach((beat) => {
      const x = HIT_LINE_X + (beat.timePositionMs - currentTimeMs) * pxPerMs;
      const isPast = beat.beatIndex < currentBeatIdx;
      const isCurrent = beat.beatIndex === currentBeatIdx;

      beat.notes.forEach((note) => {
        const y = laneY(note.stringNumber);
        const color = STRING_COLOR[note.stringNumber];
        const alpha = isPast ? 0.2 : isCurrent ? 1.0 : 0.8;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (isCurrent) {
          // Outer glow ring for the expected note
          const glow = ctx.createRadialGradient(x, y, NOTE_RADIUS, x, y, NOTE_RADIUS * 2.8);
          glow.addColorStop(0, hexToRgba(color, 0.5));
          glow.addColorStop(1, 'transparent');
          // Simplified glow: just a larger semi-transparent circle
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(x, y, NOTE_RADIUS * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha;

          // Pulsing ring
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, NOTE_RADIUS + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Main note circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Fret number (white text on colored circle)
        ctx.globalAlpha = alpha;
        ctx.fillStyle = alpha < 0.5 ? color : '#000';
        ctx.font = `bold 11px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(note.fret), x, y);

        ctx.restore();
      });
    });

    // ── Flash overlays ────────────────────────────────────────────────────────────
    const now = performance.now();
    flashesRef.current = flashesRef.current.filter(
      (f) => now - f.startTime < FLASH_DURATION_MS,
    );

    flashesRef.current.forEach((flash) => {
      const elapsed = now - flash.startTime;
      const t = elapsed / FLASH_DURATION_MS;         // 0 → 1
      const flashAlpha = Math.max(0, 1 - t) * 0.55;
      const labelAlpha = Math.max(0, 1 - t * 2.5);

      const y = laneY(flash.stringNumber);
      const LANE_H_ = H / NUM_STRINGS;

      ctx.save();

      // Lane flash rectangle
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flash.color;
      ctx.fillRect(HIT_LINE_X - 24, y - LANE_H_ / 2, 80, LANE_H_);

      // Hit label — floats upward as it fades
      const labelY = y - t * 18;
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = flash.color;
      ctx.shadowBlur = 8;
      ctx.fillText(flash.label, HIT_LINE_X + 38, labelY);
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    // ── Idle overlay ────────────────────────────────────────────────────────────
    if (!isActiveRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(10,10,15,0.6)';
      ctx.fillRect(LABEL_WIDTH, 0, W - LABEL_WIDTH, H);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '500 15px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Clique em Começar Treino para iniciar', (W + LABEL_WIDTH) / 2, H / 2);
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

  // ── Resize handling ───────────────────────────────────────────────────────────
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
