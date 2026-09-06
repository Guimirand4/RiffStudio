/**
 * songLibrary.ts
 *
 * Personal song library for RiffStudio.
 * All songs stored as AlphaTex strings (inline for Vite compatibility).
 * To add a song: create a const with AlphaTex, add an entry to SONGS[].
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  genre: string;
  bpm: number;
  durationLabel: string;
  description: string;
  alphaTex: string;
  color: string; // accent color for the card
}

// ─── AlphaTex Content ────────────────────────────────────────────────────────

const smokeOnTheWater = `\\title "Smoke on the Water"
\\artist "Deep Purple"
\\tempo 112
\\instrument 25
.
:4 5.4 7.4 8.4 | 5.4 7.4 (8.4 9.4){d} 7.4 | 5.4 7.4 8.4 7.4 | r.1 |
:4 5.4 7.4 8.4 | 5.4 7.4 (8.4 9.4){d} 7.4 | 5.4 7.4 8.4 (7.4 5.4) | r.1 |`;

const sevenNationArmy = `\\title "Seven Nation Army"
\\artist "The White Stripes"
\\tempo 124
\\instrument 25
.
:4 7.5 7.5 :8 10.5 7.5 :4 5.5 | :4 3.5 | :2 2.5 r.2 |
:4 7.5 7.5 :8 10.5 7.5 :4 5.5 | :4 3.5 | :2 2.5 r.2 |`;

const comeAsYouAre = `\\title "Come As You Are"
\\artist "Nirvana"
\\tempo 120
\\instrument 25
.
:4 2.5 2.5 :8 4.5 5.5 :4 4.5 | :4 2.5 0.5 :2 r.2 |
:4 2.5 2.5 :8 4.5 5.5 :4 4.5 | :4 2.5 0.5 :2 r.2 |
:4 4.5 4.5 :8 2.5 4.5 :4 2.5 | :4 0.5 2.5 :2 r.2 |
:4 4.5 4.5 :8 2.5 4.5 :4 2.5 | :4 0.5 r.2. |`;

// ─── Novas músicas ────────────────────────────────────────────────────────────

// Iron Man — Black Sabbath
// Riff principal: power chords descendentes em E/D/A, muito reconhecível
const ironMan = `\\title "Iron Man"
\\artist "Black Sabbath"
\\tempo 73
\\instrument 25
.
:2 0.6 :4 r.4 | :4 0.6 2.6 3.6 :8 3.6 3.6 :4 2.6 | :2 0.5 :4 r.4 | :4 0.5 2.5 3.5 :8 3.5 3.5 :4 2.5 |
:2 0.6 :4 r.4 | :4 0.6 2.6 3.6 :8 3.6 3.6 :4 2.6 | :4 5.6 6.6 7.6 5.6 | :2 4.6 r.2 |`;

// Enter Sandman intro — Metallica
// Riff de introdução: arpejo em E com nota pedal
const enterSandman = `\\title "Enter Sandman (Intro)"
\\artist "Metallica"
\\tempo 123
\\instrument 25
.
:8 0.6 0.6 :16 0.6 0.6 :8 3.6 0.6 | :8 0.6 0.6 :16 0.6 0.6 :8 2.6 0.6 |
:8 0.6 0.6 :16 0.6 0.6 :8 1.6 0.6 | :8 0.6 0.6 :16 0.6 0.6 :8 0.6 0.6 |
:8 0.6 0.6 :16 0.6 0.6 :8 3.6 0.6 | :8 0.6 0.6 :16 0.6 0.6 :8 2.6 0.6 |
:8 0.6 0.6 :16 0.6 0.6 :8 1.6 0.6 | :4 0.6 r.2. |`;

// Back in Black — AC/DC
// Riff principal: sequência de power chords em E/D/A
const backInBlack = `\\title "Back in Black"
\\artist "AC/DC"
\\tempo 96
\\instrument 25
.
:8 0.6 r.8 :4 0.6 | :8 3.5 3.5 :4 3.5 :8 0.5 0.5 | :4 2.5 :8 0.5 r.8 0.5 | :4 3.5 :8 3.5 3.5 :4 r.4 |
:8 0.6 r.8 :4 0.6 | :8 3.5 3.5 :4 3.5 :8 0.5 0.5 | :4 2.5 :8 0.5 r.8 0.5 | :2 3.5 r.2 |`;

// La Grange intro — ZZ Top
// Boogie blues em A com nota pedal característica
const laGrange = `\\title "La Grange (Intro)"
\\artist "ZZ Top"
\\tempo 160
\\instrument 25
.
:8 0.5 0.5 2.5 0.5 | :8 0.5 0.5 2.5 0.5 | :8 0.5 0.5 3.5 2.5 | :4 0.5 r.2. |
:8 0.5 0.5 2.5 0.5 | :8 0.5 0.5 2.5 0.5 | :8 0.5 2.5 3.5 2.5 | :4 0.5 r.2. |`;

// Paranoid — Black Sabbath
// Riff rápido monofônico em E, excelente para treinar velocidade e alternating picking
const paranoid = `\\title "Paranoid"
\\artist "Black Sabbath"
\\tempo 164
\\instrument 25
.
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :2 0.6 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 3.5 3.5 3.5 3.5 3.5 3.5 3.5 3.5 | :2 0.6 r.2 |`;

// ─── Song Registry ────────────────────────────────────────────────────────────

export const SONGS: Song[] = [
  // ── Nível 1 — Iniciante ────────────────────────────────────────────────────
  {
    id: 'smoke-on-the-water',
    title: 'Smoke on the Water',
    artist: 'Deep Purple',
    difficulty: 1,
    genre: 'Classic Rock',
    bpm: 112,
    durationLabel: '~1 min',
    description: 'O riff mais famoso do rock. Apenas 3 notas distintas, padrão repetitivo — ideal para começar.',
    alphaTex: smokeOnTheWater,
    color: '#7c3aed',
  },
  {
    id: 'seven-nation-army',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    difficulty: 1,
    genre: 'Alternative Rock',
    bpm: 124,
    durationLabel: '~1 min',
    description: 'Linha de baixo icônica tocada na guitarra. Ótimo para praticar timing e notas longas.',
    alphaTex: sevenNationArmy,
    color: '#dc2626',
  },

  // ── Nível 2 — Fácil ───────────────────────────────────────────────────────
  {
    id: 'come-as-you-are',
    title: 'Come As You Are',
    artist: 'Nirvana',
    difficulty: 2,
    genre: 'Grunge',
    bpm: 120,
    durationLabel: '~2 min',
    description: 'Introdução hipnótica baseada em arpejos. Treina mudança de posição e timing alternado.',
    alphaTex: comeAsYouAre,
    color: '#0891b2',
  },
  {
    id: 'iron-man',
    title: 'Iron Man',
    artist: 'Black Sabbath',
    difficulty: 2,
    genre: 'Heavy Metal',
    bpm: 73,
    durationLabel: '~2 min',
    description: 'Power chords descendentes lentos e pesados. Bom para treinar mudança de posição com precisão.',
    alphaTex: ironMan,
    color: '#64748b',
  },
  {
    id: 'enter-sandman',
    title: 'Enter Sandman (Intro)',
    artist: 'Metallica',
    difficulty: 2,
    genre: 'Heavy Metal',
    bpm: 123,
    durationLabel: '~2 min',
    description: 'Arpejo com nota pedal no baixo. Treina separação de dedos e consistência de palhetada.',
    alphaTex: enterSandman,
    color: '#b45309',
  },
  {
    id: 'back-in-black',
    title: 'Back in Black',
    artist: 'AC/DC',
    difficulty: 2,
    genre: 'Hard Rock',
    bpm: 96,
    durationLabel: '~1 min',
    description: 'Sequência de power chords com ritmo sincopado. Clássico do rock que treina ataque e dinâmica.',
    alphaTex: backInBlack,
    color: '#d97706',
  },
  {
    id: 'la-grange',
    title: 'La Grange (Intro)',
    artist: 'ZZ Top',
    difficulty: 2,
    genre: 'Blues Rock',
    bpm: 160,
    durationLabel: '~1 min',
    description: 'Boogie blues com nota pedal em A. Excelente para treinar groove, velocidade e nota pedal.',
    alphaTex: laGrange,
    color: '#059669',
  },

  // ── Nível 3 — Intermediário ───────────────────────────────────────────────
  {
    id: 'paranoid',
    title: 'Paranoid',
    artist: 'Black Sabbath',
    difficulty: 3,
    genre: 'Heavy Metal',
    bpm: 164,
    durationLabel: '~2 min',
    description: 'Riff rápido monofônico em E. Treina velocidade, alternating picking e resistência.',
    alphaTex: paranoid,
    color: '#9333ea',
  },
];

export function getSongById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
