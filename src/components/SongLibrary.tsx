import styles from './SongLibrary.module.css';
import { SONGS } from '../lib/songLibrary';
import type { Song } from '../lib/songLibrary';

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

export function SongLibrary({ onSelectSong }: SongLibraryProps) {
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
            <span className={styles.heroStatValue}>{SONGS.length}</span>
            <span className={styles.heroStatLabel}>Músicas</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>MPM</span>
            <span className={styles.heroStatLabel}>Algoritmo</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>Real-time</span>
            <span className={styles.heroStatLabel}>Detecção</span>
          </div>
        </div>
      </header>

      {/* Subtitle */}
      <div className={styles.subtitle}>
        <h2 className={styles.sectionTitle}>Biblioteca de Músicas</h2>
        <p className={styles.sectionDesc}>
          Escolha uma música, conecte seu microfone e comece a praticar.
          O app escuta em tempo real e avança automaticamente conforme você toca.
        </p>
      </div>

      {/* Song grid */}
      <div className={styles.grid}>
        {SONGS.map((song, i) => (
          <article
            key={song.id}
            id={`song-card-${song.id}`}
            className={styles.card}
            style={{
              '--card-color': song.color,
              animationDelay: `${i * 80}ms`,
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
            <button
              id={`practice-${song.id}`}
              className={`btn btn-primary ${styles.practiceBtn}`}
              onClick={() => onSelectSong(song)}
              style={{ background: song.color, color: '#07070d' }}
            >
              Praticar →
            </button>
          </article>
        ))}
      </div>

      {/* Footer tip */}
      <div className={styles.tip}>
        💡 <strong>Dica:</strong> Comece com Smoke on the Water — apenas 3 notas distintas, ideal para calibrar o microfone.
      </div>
    </div>
  );
}
