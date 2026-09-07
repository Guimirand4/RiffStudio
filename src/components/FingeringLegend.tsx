import React from 'react';
import styles from './FingeringLegend.module.css';

export function FingeringLegend() {
  return (
    <div className={styles.legendContainer}>
      <div className={styles.handWrapper}>
        <svg viewBox="0 0 110 120" className={styles.handIcon} xmlns="http://www.w3.org/2000/svg">
          {/* Palm / Back of hand */}
          <path d="M 15 50 Q 10 110 35 110 L 65 110 Q 90 110 85 50 Z" fill="#64748b" />
          
          {/* Pinky (4) */}
          <rect x="15" y="35" width="14" height="30" rx="7" fill="#64748b" />
          <path d="M 15 42 Q 15 35 22 35 Q 29 35 29 42 L 29 50 L 15 50 Z" fill="#f43f5e" />
          <text x="22" y="25" fontSize="12" fill="#f43f5e" textAnchor="middle" fontWeight="bold">4</text>

          {/* Ring (3) */}
          <rect x="31" y="20" width="14" height="45" rx="7" fill="#64748b" />
          <path d="M 31 27 Q 31 20 38 20 Q 45 20 45 27 L 45 35 L 31 35 Z" fill="#f97316" />
          <text x="38" y="10" fontSize="12" fill="#f97316" textAnchor="middle" fontWeight="bold">3</text>

          {/* Middle (2) */}
          <rect x="47" y="15" width="14" height="50" rx="7" fill="#64748b" />
          <path d="M 47 22 Q 47 15 54 15 Q 61 15 61 22 L 61 30 L 47 30 Z" fill="#a855f7" />
          <text x="54" y="5" fontSize="12" fill="#a855f7" textAnchor="middle" fontWeight="bold">2</text>

          {/* Index (1) */}
          <rect x="63" y="25" width="14" height="40" rx="7" fill="#64748b" />
          <path d="M 63 32 Q 63 25 70 25 Q 77 25 77 32 L 77 40 L 63 40 Z" fill="#38bdf8" />
          <text x="70" y="15" fontSize="12" fill="#38bdf8" textAnchor="middle" fontWeight="bold">1</text>

          {/* Thumb */}
          <path d="M 80 55 Q 105 60 100 85 Q 90 95 82 85 Z" fill="#64748b" />
        </svg>

        <div className={styles.openString}>
          <span className={styles.openDot}></span>
          <span className={styles.openLabel}>Corda Solta (0)</span>
        </div>
      </div>
    </div>
  );
}
