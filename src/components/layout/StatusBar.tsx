import { useTheme } from '../../themes';
import { t } from '../../i18n/zh';
import styles from './StatusBar.module.css';
import type { ReactNode } from 'react';

interface StatusBarProps {
  cols?: number;
  rows?: number;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected';
  children?: ReactNode;
}

export function StatusBar({ cols = 80, rows = 24, connectionStatus = 'disconnected', children }: StatusBarProps) {
  const { currentTheme } = useTheme();

  const statusText = connectionStatus === 'connected' ? t('status.connected')
    : connectionStatus === 'connecting' ? t('status.connecting')
    : t('status.disconnected');

  const dotColor = connectionStatus === 'connected' ? '#a6e3a1'
    : connectionStatus === 'connecting' ? '#f9e2af'
    : '#f38ba8';

  return (
    <footer className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} style={{ backgroundColor: dotColor }} />
          {statusText}
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
