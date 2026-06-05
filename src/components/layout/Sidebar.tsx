import { useTheme } from '../../themes';
import ThemeSelector from '../ThemeSelector';
import type { SessionConfig } from '../../config';
import { t } from '../../i18n/zh';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onNewConnection?: () => void;
  sessions?: SessionConfig[];
  onSessionClick?: (session: SessionConfig) => void;
  onManageSessions?: () => void;
}

export function Sidebar({
  onNewConnection,
  sessions = [],
  onSessionClick,
  onManageSessions,
}: SidebarProps) {
  useTheme(); // Apply theme context

  // Group sessions by their group field
  const groupedSessions = sessions.reduce<Record<string, SessionConfig[]>>((acc, session) => {
    const group = session.group || 'Default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {});

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('app.name')}</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('sidebar.connection')}</h2>
        <button className={styles.newConnectionButton} onClick={onNewConnection}>
          {t('sidebar.newConnection')}
        </button>
      </div>

      {/* Saved Sessions */}
      <div className={styles.sessionsSection}>
        <h2 className={styles.sectionTitle}>
          <span>{t('sidebar.sessions')}</span>
          <button className={styles.manageButton} onClick={onManageSessions}>
            {t('sidebar.manage')}
          </button>
        </h2>
        {sessions.length === 0 ? (
          <div className={styles.emptySessions}>{t('sidebar.noSessions')}</div>
        ) : (
          <div className={styles.sessionsList}>
            {Object.entries(groupedSessions).map(([group, groupSessions]) => (
              <div key={group} className={styles.sessionGroup}>
                {Object.keys(groupedSessions).length > 1 && (
                  <div className={styles.sessionGroupTitle}>{group}</div>
                )}
                {groupSessions.map(session => (
                  <div
                    key={session.id}
                    className={styles.sessionItem}
                    onClick={() => onSessionClick?.(session)}
                  >
                    <span className={styles.sessionName}>{session.name}</span>
                    <span className={styles.sessionHost}>
                      {session.username}@{session.host}:{session.port}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Monitor 暂时隐藏 - 待实现真实监控功能 */}

      <div className={styles.footer}>
        <ThemeSelector />
      </div>
    </aside>
  );
}

export default Sidebar;
