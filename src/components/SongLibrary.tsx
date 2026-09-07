import { useState } from 'react';
import styles from './SongLibrary.module.css';
import { SONGS } from '../lib/songLibrary';
import type { Song } from '../lib/songLibrary';
import { GuitarTuner } from './GuitarTuner';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante',
  2: 'Fácil',
  3: 'Intermediário',
  4: 'Avançado',
  5: 'Expert',
};

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className={styles.stars} aria-label={`Dificuldade: ${DIFFICULTY_LABELS[level]}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < level ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
      <span className={styles.difficultyLabel}>{DIFFICULTY_LABELS[level]}</span>
    </div>
  );
}

function SongCard({ song, onSelect }: { song: Song; onSelect: (s: Song) => void }) {
  return (
    <article
      key={song.id}
      id={`song-card-${song.id}`}
      className={`${styles.card} ${song.comingSoon ? styles.cardComingSoon : ''}`}
      style={{
        '--card-color': song.color,
        animationDelay: `${Math.random() * 200}ms`,
      } as React.CSSProperties}
    >
      {/* Card accent line */}
      <div className={styles.cardAccent} style={{ background: song.color }} />

      {/* Card body */}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span className={`badge`} style={{
            background: `${song.color}22`,
            color: song.color,
            border: `1px solid ${song.color}44`,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
          }}>
            {song.genre}
          </span>
          <span className={styles.bpmBadge}>{song.bpm} BPM</span>
        </div>

        <h3 className={styles.cardTitle}>{song.title}</h3>
        <p className={styles.cardArtist}>{song.artist}</p>
        <p className={styles.cardDesc}>{song.description}</p>

        <div className={styles.cardFooter}>
          <DifficultyStars level={song.difficulty} />
          <span className={styles.duration}>⏱ {song.durationLabel}</span>
        </div>
      </div>

      {/* CTA */}
      {song.comingSoon ? (
        <div className={styles.comingSoonBadge}>
          🚧 Em Breve
        </div>
      ) : (
        <button
          id={`practice-${song.id}`}
          className={`btn btn-primary ${styles.practiceBtn}`}
          onClick={() => onSelect(song)}
          style={{ background: song.color, color: '#07070d' }}
        >
          Praticar →
        </button>
      )}
    </article>
  );
}

type ActiveSection = 'riffs' | 'full-songs' | 'tuner';

export function SongLibrary({ onSelectSong }: SongLibraryProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('riffs');

  const riffs = SONGS.filter(s => s.category === 'riff');
  const fullSongs = SONGS.filter(s => s.category === 'full-song');

  return (
    <div className={styles.page}>
      {/* Hero header */}
      <header className={styles.hero}>
        <div className={styles.logoArea}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#111119"/>
            <path d="M20 6c0 0-2 1-4 3s-3 4-3 4l-5 5c-1.5 1.5-1.5 4 0 5.5s4 1.5 5.5 0l5-5c0 0 2-1 4-3s3-4 3-4" stroke="#39ff14" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="10" cy="22" r="2" fill="#39ff14"/>
          </svg>
          <div>
            <h1 className={styles.appName}>RiffStudio</h1>
            <p className={styles.appTagline}>Guitar Trainer Pessoal</p>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{riffs.length}</span>
            <span className={styles.heroStatLabel}>Riffs</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{fullSongs.length}</span>
            <span className={styles.heroStatLabel}>Completas</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>Real-time</span>
            <span className={styles.heroStatLabel}>Detecção</span>
          </div>
        </div>
      </header>

      {/* Section nav tabs */}
      <nav className={styles.sectionNav}>
        <button
          className={`${styles.sectionTab} ${activeSection === 'riffs' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('riffs')}
        >
          🎸 Riffs & Intros
        </button>
        <button
          className={`${styles.sectionTab} ${activeSection === 'full-songs' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('full-songs')}
        >
          🎵 Músicas Completas
        </button>
        <button
          className={`${styles.sectionTab} ${activeSection === 'tuner' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('tuner')}
        >
          🎼 Afinador
        </button>
      </nav>

      {/* ── Riffs Section ── */}
      {activeSection === 'riffs' && (
        <>
          <div className={styles.subtitle}>
            <h2 className={styles.sectionTitle}>Riffs & Intros</h2>
            <p className={styles.sectionDesc}>
              Trechos icônicos das músicas mais famosas do rock. Perfeito para treinar técnicas específicas ou aquecer antes de uma sessão.
            </p>
          </div>
          <div className={styles.grid}>
            {riffs.map(song => (
              <SongCard key={song.id} song={song} onSelect={onSelectSong} />
            ))}
          </div>
          <div className={styles.tip}>
            💡 <strong>Dica:</strong> Comece com Smoke on the Water — apenas 3 notas distintas, ideal para calibrar o microfone.
          </div>
        </>
      )}

      {/* ── Full Songs Section ── */}
      {activeSection === 'full-songs' && (
        <>
          <div className={styles.subtitle}>
            <h2 className={styles.sectionTitle}>Músicas Completas</h2>
            <p className={styles.sectionDesc}>
              Músicas inteiras do começo ao fim — verso, refrão, solo e tudo mais. O desafio real de tocar junto com a música.
            </p>
          </div>

          <div className={styles.grid}>
            {fullSongs.map(song => (
              <SongCard key={song.id} song={song} onSelect={onSelectSong} />
            ))}
          </div>
        </>
      )}

      {/* ── Tuner Section ── */}
      {activeSection === 'tuner' && (
        <>
          <div className={styles.subtitle}>
            <h2 className={styles.sectionTitle}>Afinador de Guitarra</h2>
            <p className={styles.sectionDesc}>
              Afine sua guitarra antes de praticar. Clique em iniciar, toque cada corda solta e ajuste até o ponteiro centralizar.
            </p>
          </div>
          <div className={styles.tunerWrapper}>
            <GuitarTuner />
            <div className={styles.tunerGuide}>
              <h3>Afinação Padrão (Standard E)</h3>
              <table className={styles.tuningTable}>
                <thead>
                  <tr>
                    <th>Corda</th>
                    <th>Nota</th>
                    <th>Frequência</th>
                    <th>Dica</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: 1, name: 'e', freq: '329.6 Hz', tip: 'Corda mais fina, mais aguda' },
                    { n: 2, name: 'B', freq: '246.9 Hz', tip: '2ª corda' },
                    { n: 3, name: 'G', freq: '196.0 Hz', tip: '3ª corda (cuidado — mais sensível)' },
                    { n: 4, name: 'D', freq: '146.8 Hz', tip: '4ª corda' },
                    { n: 5, name: 'A', freq: '110.0 Hz', tip: '5ª corda' },
                    { n: 6, name: 'E', freq: '82.4 Hz', tip: 'Corda mais grossa, mais grave' },
                  ].map(row => (
                    <tr key={row.n}>
                      <td className={styles.tdNum}>{row.n}</td>
                      <td className={styles.tdName}>{row.name}</td>
                      <td className={styles.tdFreq}>{row.freq}</td>
                      <td className={styles.tdTip}>{row.tip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
