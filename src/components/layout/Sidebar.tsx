import { useTheme } from '../../themes';
import ThemeSelector from '../ThemeSelector';
import type { SessionConfig } from '../../config';
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
        <h1 className={styles.title}>NovaTerm</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Connection</h2>
        <button className={styles.newConnectionButton} onClick={onNewConnection}>
          + New Connection
        </button>
      </div>

      {/* Saved Sessions */}
      <div className={styles.sessionsSection}>
        <h2 className={styles.sectionTitle}>
          <span>Sessions</span>
          <button className={styles.manageButton} onClick={onManageSessions}>
            Manage
          </button>
        </h2>
        {sessions.length === 0 ? (
          <div className={styles.emptySessions}>No saved sessions</div>
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

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>System Monitor</h2>
        <div className={styles.monitorPlaceholder}>
          <div className={styles.monitorItem}>
            <span className={styles.monitorLabel}>CPU</span>
            <div className={styles.monitorBar}>
              <div className={styles.monitorBarFill} style={{ width: '0%' }} />
            </div>
          </div>
          <div className={styles.monitorItem}>
            <span className={styles.monitorLabel}>Memory</span>
            <div className={styles.monitorBar}>
              <div className={styles.monitorBarFill} style={{ width: '0%' }} />
            </div>
          </div>
          <div className={styles.monitorItem}>
            <span className={styles.monitorLabel}>Network</span>
            <div className={styles.monitorBar}>
              <div className={styles.monitorBarFill} style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <ThemeSelector />
      </div>
    </aside>
  );
}

export default Sidebar;
