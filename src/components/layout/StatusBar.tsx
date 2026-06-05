import { useTheme } from '../../themes';
import styles from './StatusBar.module.css';
import type { ReactNode } from 'react';

interface StatusBarProps {
  cols?: number;
  rows?: number;
  children?: ReactNode;
}

export function StatusBar({ cols = 80, rows = 24, children }: StatusBarProps) {
  const { currentTheme } = useTheme();

  return (
    <footer className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} />
          Disconnected
        </span>
        {children}
      </div>
      <div className={styles.right}>
        <span className={styles.statusItem}>
          {cols} × {rows}
        </span>
        <span className={styles.divider}>|</span>
        <span className={styles.statusItem}>
          {currentTheme.displayName}
        </span>
      </div>
    </footer>
  );
}

export default StatusBar;
