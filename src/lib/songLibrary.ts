/**
 * songLibrary.ts
 *
 * Personal song library for RiffStudio.
 * All songs stored as AlphaTex strings (inline for Vite compatibility).
 * To add a song: create a const with AlphaTex, add an entry to SONGS[].
 */

import { fullSmokeOnTheWater, fullSmokeOnTheWaterSimplified } from './tabs/smokeOnTheWater';
import { fullSevenNationArmy, fullSevenNationArmySimplified } from './tabs/sevenNationArmy';
import { fullComeAsYouAre, fullComeAsYouAreSimplified } from './tabs/comeAsYouAre';
import { fullParanoid, fullParanoidSimplified } from './tabs/paranoid';
import { fullBackInBlack, fullBackInBlackSimplified } from './tabs/backInBlack';
import { californicationRiff, californicationRiffSimplified, fullCalifornication, fullCalifornicationSimplified } from './tabs/californication';

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type SongCategory = 'riff' | 'full-song';

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
  category: SongCategory;
  comingSoon?: boolean; // marks songs not yet fully encoded
}

// ─── AlphaTex Content ────────────────────────────────────────────────────────

const smokeOnTheWater = `\\title "Smoke on the Water"
\\artist "Deep Purple"
\\tempo 112
\\instrument 25
.
:4 (0.4 0.3) (3.4 3.3) (5.4 5.3) | (0.4 0.3) (3.4 3.3) :8 (6.4 6.3) (5.4 5.3) :4 (5.4 5.3) | :4 (0.4 0.3) (3.4 3.3) (5.4 5.3) | (3.4 3.3) (0.4 0.3) r.2 |
:4 (0.4 0.3) (3.4 3.3) (5.4 5.3) | (0.4 0.3) (3.4 3.3) :8 (6.4 6.3) (5.4 5.3) :4 (5.4 5.3) | :4 (0.4 0.3) (3.4 3.3) (5.4 5.3) | (3.4 3.3) (0.4 0.3) r.2 |`;

const sevenNationArmy = `\\title "Seven Nation Army"
\\artist "The White Stripes"
\\tempo 124
\\instrument 25
.
:4 (7.5 9.4 9.3) (7.5 9.4 9.3) :8 (10.5 12.4 12.3) (7.5 9.4 9.3) :4 (5.5 7.4 7.3) | :4 (3.5 5.4 5.3) | :2 (2.5 4.4 4.3) r.2 |
:4 (7.5 9.4 9.3) (7.5 9.4 9.3) :8 (10.5 12.4 12.3) (7.5 9.4 9.3) :4 (5.5 7.4 7.3) | :4 (3.5 5.4 5.3) (5.5 7.4 7.3) (3.5 5.4 5.3) (2.5 4.4 4.3) |`;

const comeAsYouAre = `\\title "Come As You Are"
\\artist "Nirvana"
\\tempo 120
\\tuning D G C F A D
\\instrument 25
.
:8 0.6 0.6 1.6 2.6 0.5 2.6 0.5 2.6 | :8 2.6 1.6 0.6 0.6 2.5 0.6 r.4 |
:8 0.6 0.6 1.6 2.6 0.5 2.6 0.5 2.6 | :8 2.6 1.6 0.6 0.6 2.5 0.6 r.4 |
:8 0.6 0.6 1.6 2.6 0.5 2.6 0.5 2.6 | :8 2.6 1.6 0.6 0.6 2.5 0.6 r.4 |
:8 0.6 0.6 1.6 2.6 0.5 2.6 0.5 2.6 | :8 2.6 1.6 0.6 0.6 2.5 0.6 r.4 |`;

// ─── Novas músicas ────────────────────────────────────────────────────────────

// Iron Man — Black Sabbath
// Riff principal: power chords descendentes em E/D/A, muito reconhecível
const ironMan = `\\title "Iron Man"
\\artist "Black Sabbath"
\\tempo 100
\\instrument 25
.
:4 (7.5 9.4) :8 (10.5 12.4) :4 (10.5 12.4) :8 (12.5 14.4) :4 (12.5 14.4) | :16 15.5 14.5 15.5 14.5 15.5 :8 (10.5 12.4) :4 (10.5 12.4) :8 (12.5 14.4) :4 (12.5 14.4) |
:4 (7.5 9.4) :8 (10.5 12.4) :4 (10.5 12.4) :8 (12.5 14.4) :4 (12.5 14.4) | :16 15.5 14.5 15.5 14.5 15.5 :8 (10.5 12.4) :4 (10.5 12.4) :8 (12.5 14.4) :4 (12.5 14.4) |`;

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
// Combinação clássica de power chords e licks rápidos, um marco do rock
const backInBlack = `\\title "Back in Black"
\\artist "AC/DC"
\\tempo 96
\\instrument 25
.
:4 (0.6 2.5 2.4) r.8 :8 (0.4 2.3 3.2) (0.4 2.3 3.2) (0.4 2.3 3.2) r.8 | :8 (0.5 2.4 2.3) (0.5 2.4 2.3) (0.5 2.4 2.3) r.8 :8 3.1 0.1 3.2 0.2 3.3 0.3 |
:4 (0.6 2.5 2.4) r.8 :8 (0.4 2.3 3.2) (0.4 2.3 3.2) (0.4 2.3 3.2) r.8 | :8 (0.5 2.4 2.3) (0.5 2.4 2.3) (0.5 2.4 2.3) r.8 :8 2.5 4.6 2.5 5.6 2.5 6.6 2.5 7.6 |`;

// La Grange intro — ZZ Top
// Boogie blues em A com nota pedal característica
const laGrange = `\\title "La Grange (Intro)"
\\artist "ZZ Top"
\\tempo 160
\\instrument 25
.
:8 (0.5 2.4 2.3) r.8 (0.5 2.4 2.3) r.8 (0.5 2.4 2.3) (0.5 2.4 2.3) :4 (3.5 5.4 5.3) | :8 (0.5 2.4 2.3) r.8 (0.5 2.4 2.3) r.8 (0.5 2.4 2.3) (0.5 2.4 2.3) :4 (3.5 5.4 5.3) |`;

const smokeOnTheWaterSimplified = `\\title "Smoke on the Water - Simplificada"
\\artist "Deep Purple"
\\tempo 112
\\instrument 25
.
:4 5.4 7.4 8.4 | 5.4 7.4 (8.4 9.4){d} 7.4 | 5.4 7.4 8.4 7.4 | r.1 |
:4 5.4 7.4 8.4 | 5.4 7.4 (8.4 9.4){d} 7.4 | 5.4 7.4 8.4 (7.4 5.4) | r.1 |`;

const sevenNationArmySimplified = `\\title "Seven Nation Army - Simplificada"
\\artist "The White Stripes"
\\tempo 124
\\instrument 25
.
:4 7.5 7.5 :8 10.5 7.5 :4 5.5 | :4 3.5 | :2 2.5 r.2 |
:4 7.5 7.5 :8 10.5 7.5 :4 5.5 | :4 3.5 | :2 2.5 r.2 |`;

const comeAsYouAreSimplified = `\\title "Come As You Are - Simplificada"
\\artist "Nirvana"
\\tempo 120
\\instrument 25
.
:4 2.5 2.5 :8 4.5 5.5 :4 4.5 | :4 2.5 0.5 :2 r.2 |
:4 2.5 2.5 :8 4.5 5.5 :4 4.5 | :4 2.5 0.5 :2 r.2 |
:4 4.5 4.5 :8 2.5 4.5 :4 2.5 | :4 0.5 2.5 :2 r.2 |
:4 4.5 4.5 :8 2.5 4.5 :4 2.5 | :4 0.5 r.2. |`;

const paranoidSimplified = `\\title "Paranoid - Simplificada"
\\artist "Black Sabbath"
\\tempo 164
\\instrument 25
.
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :2 0.6 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 3.5 3.5 3.5 3.5 3.5 3.5 3.5 3.5 | :2 0.6 r.2 |`;

const backInBlackSimplified = `\\title "Back in Black - Simplificada"
\\artist "AC/DC"
\\tempo 96
\\instrument 25
.
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :2 0.6 |
:8 0.6 2.6 4.6 :4 4.6 :8 3.6 | :8 3.6 4.6 3.6 :4 0.6 r.4 |
:8 3.5 3.5 3.5 3.5 3.5 3.5 3.5 3.5 | :2 0.6 r.2 |`;

const ironManSimplified = `\\title "Iron Man - Simplificada"
\\artist "Black Sabbath"
\\tempo 73
\\instrument 25
.
:2 0.6 :4 r.4 | :4 0.6 2.6 3.6 :8 3.6 3.6 :4 2.6 | :2 0.5 :4 r.4 | :4 0.5 2.5 3.5 :8 3.5 3.5 :4 2.5 |
:2 0.6 :4 r.4 | :4 0.6 2.6 3.6 :8 3.6 3.6 :4 2.6 | :4 5.6 6.6 7.6 5.6 | :2 4.6 r.2 |`;

const laGrangeSimplified = `\\title "La Grange (Intro) - Simplificada"
\\artist "ZZ Top"
\\tempo 160
\\instrument 25
.
:8 0.5 r.8 0.5 r.8 0.5 0.5 3.5 3.5 | :8 0.5 r.8 0.5 r.8 0.5 0.5 3.5 3.5 | :8 0.5 r.8 0.5 r.8 0.5 0.5 3.5 3.5 |`;

// Paranoid — Black Sabbath
// Riff rápido em E, excelente para treinar velocidade e alternating picking
const paranoid = `\\title "Paranoid"
\\artist "Black Sabbath"
\\tempo 164
\\instrument 25
.
:8 (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) | :8 12.5 14.5 12.5 14.5 12.5 14.5 r.4 |
:8 (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) | :8 12.4 14.4 12.4 14.4 12.4 14.4 r.4 |
:8 (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) (12.6 14.5) | :8 12.5 14.5 12.5 14.5 12.5 14.5 r.4 |
:8 (10.5 12.4) (10.5 12.4) (10.5 12.4) (10.5 12.4) (10.5 12.4) (10.5 12.4) (10.5 12.4) (10.5 12.4) | :2 (12.6 14.5) r.2 |`;

// ─── Song Registry ────────────────────────────────────────────────────────────

export const SONGS: Song[] = [
  // ── Riffs: Nível 1 — Iniciante ────────────────────────────────────────────────
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
    category: 'riff',
  },
  {
    id: 'smoke-on-the-water-simplified',
    title: 'Smoke on the Water (Simplificada)',
    artist: 'Deep Purple',
    difficulty: 1,
    genre: 'Classic Rock',
    bpm: 112,
    durationLabel: '~1 min',
    description: 'Versão monofônica simplificada, perfeita para iniciantes focarem apenas na corda certa.',
    alphaTex: smokeOnTheWaterSimplified,
    color: '#7c3aed',
    category: 'riff',
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
    category: 'riff',
  },
  {
    id: 'seven-nation-army-simplified',
    title: 'Seven Nation Army (Simplificada)',
    artist: 'The White Stripes',
    difficulty: 1,
    genre: 'Alternative Rock',
    bpm: 124,
    durationLabel: '~1 min',
    description: 'Versão tocada apenas com notas únicas para facilitar a troca de casas na corda A.',
    alphaTex: sevenNationArmySimplified,
    color: '#dc2626',
    category: 'riff',
  },

  // ── Riffs: Nível 2 — Fácil ───────────────────────────────────────────────────
  {
    id: 'come-as-you-are',
    title: 'Come As You Are',
    artist: 'Nirvana',
    difficulty: 2,
    genre: 'Grunge',
    bpm: 120,
    durationLabel: '~2 min',
    description: 'Introdução hipótica baseada em arpejos. Treina mudança de posição e timing alternado.',
    alphaTex: comeAsYouAre,
    color: '#0891b2',
    category: 'riff',
  },
  {
    id: 'come-as-you-are-simplified',
    title: 'Come As You Are (Simplificada)',
    artist: 'Nirvana',
    difficulty: 2,
    genre: 'Grunge',
    bpm: 120,
    durationLabel: '~2 min',
    description: 'Apenas notas únicas baseadas na tônica para treinar o ritmo base.',
    alphaTex: comeAsYouAreSimplified,
    color: '#0891b2',
    category: 'riff',
  },
  {
    id: 'iron-man',
    title: 'Iron Man',
    artist: 'Black Sabbath',
    difficulty: 2,
    genre: 'Heavy Metal',
    bpm: 73,
    durationLabel: '~2 min',
    description: 'Riff clássico do heavy metal. Simples e pesado. Ensina a fazer slides.',
    alphaTex: ironMan,
    color: '#0284c7',
    category: 'riff',
  },
  {
    id: 'iron-man-simplified',
    title: 'Iron Man (Simplificada)',
    artist: 'Black Sabbath',
    difficulty: 2,
    genre: 'Heavy Metal',
    bpm: 73,
    durationLabel: '~2 min',
    description: 'O riff clássico traduzido para notas simples. Ótimo para iniciantes sem pestana.',
    alphaTex: ironManSimplified,
    color: '#0284c7',
    category: 'riff',
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
    category: 'riff',
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
    color: '#334155',
    category: 'riff',
  },
  {
    id: 'back-in-black-simplified',
    title: 'Back in Black (Simplificada)',
    artist: 'AC/DC',
    difficulty: 3,
    genre: 'Hard Rock',
    bpm: 96,
    durationLabel: '~1 min',
    description: 'A base tocada em notas únicas. Perfeita para praticar licks mantendo a fundação.',
    alphaTex: backInBlackSimplified,
    color: '#334155',
    category: 'riff',
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
    category: 'riff',
  },
  {
    id: 'la-grange-simplified',
    title: 'La Grange (Intro) - Simplificada',
    artist: 'ZZ Top',
    difficulty: 2,
    genre: 'Blues Rock',
    bpm: 160,
    durationLabel: '~1 min',
    description: 'Boogie blues tocado com apenas uma nota por vez, ideal para o motor entender cada acerto.',
    alphaTex: laGrangeSimplified,
    color: '#059669',
    category: 'riff',
  },

  // ── Riffs: Nível 3 — Intermediário ───────────────────────────────────────────
  {
    id: 'paranoid',
    title: 'Paranoid',
    artist: 'Black Sabbath',
    difficulty: 3,
    genre: 'Heavy Metal',
    bpm: 164,
    durationLabel: '~2 min',
    description: 'Riff rápido em E. Treina velocidade, alternating picking e resistência.',
    alphaTex: paranoid,
    color: '#9333ea',
    category: 'riff',
  },
  {
    id: 'paranoid-simplified',
    title: 'Paranoid (Simplificada)',
    artist: 'Black Sabbath',
    difficulty: 2,
    genre: 'Heavy Metal',
    bpm: 164,
    durationLabel: '~2 min',
    description: 'A versão tocada apenas com a nota E solta e pestanas, excelente para velocidade sem a complicação de dedilhar.',
    alphaTex: paranoidSimplified,
    color: '#9333ea',
    category: 'riff',
  },
  {
    id: 'californication-intro',
    title: 'Californication (Intro)',
    artist: 'Red Hot Chili Peppers',
    difficulty: 3,
    genre: 'Alternative Rock',
    bpm: 96,
    durationLabel: '~12s',
    description: 'O famoso dedilhado inicial alternando entre Am e Fmaj7.',
    alphaTex: californicationRiff,
    color: '#0ea5e9',
    category: 'riff',
  },
  {
    id: 'californication-intro-simplified',
    title: 'Californication (Intro) - Simpl.',
    artist: 'Red Hot Chili Peppers',
    difficulty: 2,
    genre: 'Alternative Rock',
    bpm: 96,
    durationLabel: '~12s',
    description: 'O famoso dedilhado tocado numa versão monofônica simplificada para facilitar a palhetada.',
    alphaTex: californicationRiffSimplified,
    color: '#0ea5e9',
    category: 'riff',
  },

  // ── Músicas Completas ────────────────────────────────────────────────────────
  {
    id: 'full-smoke-on-the-water',
    title: 'Smoke on the Water',
    artist: 'Deep Purple',
    difficulty: 2,
    genre: 'Classic Rock',
    bpm: 112,
    durationLabel: '~5 min',
    description: 'Versão inteira da música, do riff icônico até o final. Uma resistência para iniciantes.',
    alphaTex: fullSmokeOnTheWater,
    color: '#7c3aed',
    category: 'full-song',
  },
  {
    id: 'full-smoke-on-the-water-simplified',
    title: 'Smoke on the Water (Completa, Simpl.)',
    artist: 'Deep Purple',
    difficulty: 2,
    genre: 'Classic Rock',
    bpm: 112,
    durationLabel: '~5 min',
    description: 'A música completa tocada apenas de forma monofônica, ideal para resistência inicial.',
    alphaTex: fullSmokeOnTheWaterSimplified,
    color: '#7c3aed',
    category: 'full-song',
  },
  {
    id: 'full-seven-nation-army',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    difficulty: 2,
    genre: 'Alternative Rock',
    bpm: 124,
    durationLabel: '~3 min',
    description: 'O hino dos estádios, versão completa passando pelo riff, versos rápidos e o solo.',
    alphaTex: fullSevenNationArmy,
    color: '#dc2626',
    category: 'full-song',
  },
  {
    id: 'full-seven-nation-army-simplified',
    title: 'Seven Nation Army (Completa, Simpl.)',
    artist: 'The White Stripes',
    difficulty: 2,
    genre: 'Alternative Rock',
    bpm: 124,
    durationLabel: '~4 min',
    description: 'Versão focada apenas no riff e notas principais, para treinar memória muscular sem chords pesados.',
    alphaTex: fullSevenNationArmySimplified,
    color: '#dc2626',
    category: 'full-song',
  },
  {
    id: 'full-come-as-you-are',
    title: 'Come As You Are',
    artist: 'Nirvana',
    difficulty: 3,
    genre: 'Grunge',
    bpm: 120,
    durationLabel: '~3 min 40s',
    description: 'Música inteira, desde o dedilhado introspectivo até o refrão rasgado e o solo estranho e lindo.',
    alphaTex: fullComeAsYouAre,
    color: '#0891b2',
    category: 'full-song',
  },
  {
    id: 'full-come-as-you-are-simplified',
    title: 'Come As You Are (Completa, Simpl.)',
    artist: 'Nirvana',
    difficulty: 3,
    genre: 'Grunge',
    bpm: 120,
    durationLabel: '~3 min',
    description: 'O clássico do grunge apenas na sua fundação, tirando acordes pesados para que iniciantes possam focar.',
    alphaTex: fullComeAsYouAreSimplified,
    color: '#0891b2',
    category: 'full-song',
  },
  {
    id: 'full-paranoid',
    title: 'Paranoid',
    artist: 'Black Sabbath',
    difficulty: 4,
    genre: 'Heavy Metal',
    bpm: 164,
    durationLabel: '~2 min 50s',
    description: 'Faixa inteira da obra prima de Tony Iommi. Riffs viscerais, mudança de ritmo e a verdadeira fundação do Heavy Metal.',
    alphaTex: fullParanoid,
    color: '#9333ea',
    category: 'full-song',
  },
  {
    id: 'full-paranoid-simplified',
    title: 'Paranoid (Completa, Simplificada)',
    artist: 'Black Sabbath',
    difficulty: 3,
    genre: 'Heavy Metal',
    bpm: 164,
    durationLabel: '~3 min',
    description: 'A música completa sem power chords. Um teste definitivo de velocidade pura na palhetada alternada.',
    alphaTex: fullParanoidSimplified,
    color: '#9333ea',
    category: 'full-song',
  },
  {
    id: 'full-back-in-black',
    title: 'Back in Black',
    artist: 'AC/DC',
    difficulty: 3,
    genre: 'Hard Rock',
    bpm: 96,
    durationLabel: '~4 min 15s',
    description: 'O manual de como tocar Hard Rock e soar pesado, arrastado e dançante ao mesmo tempo. Riff monstruoso.',
    alphaTex: fullBackInBlack,
    color: '#334155',
    category: 'full-song',
  },
  {
    id: 'full-back-in-black-simplified',
    title: 'Back in Black (Completa, Simplificada)',
    artist: 'AC/DC',
    difficulty: 4,
    genre: 'Hard Rock',
    bpm: 96,
    durationLabel: '~4 min',
    description: 'Notas individuais ditando a fundação rítmica. Ensina a preencher espaços e palhetar licks.',
    alphaTex: fullBackInBlackSimplified,
    color: '#334155',
    category: 'full-song',
  },
  {
    id: 'full-californication',
    title: 'Californication',
    artist: 'Red Hot Chili Peppers',
    difficulty: 3,
    genre: 'Alternative Rock',
    bpm: 96,
    durationLabel: '~5 min 30s',
    description: 'O dedilhado magistral, os acordes abertos, os licks funkys do Flea transcritos e o solo belíssimo e simples de Frusciante.',
    alphaTex: fullCalifornication,
    color: '#0ea5e9',
    category: 'full-song',
  },
  {
    id: 'full-californication-simplified',
    title: 'Californication (Completa, Simpl.)',
    artist: 'Red Hot Chili Peppers',
    difficulty: 3,
    genre: 'Alternative Rock',
    bpm: 96,
    durationLabel: '~5 min',
    description: 'Toda a música arranjada de forma monofônica, ótima introdução ao universo dos Chilli Peppers.',
    alphaTex: fullCalifornicationSimplified,
    color: '#0ea5e9',
    category: 'full-song',
  },
];

export function getSongById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
