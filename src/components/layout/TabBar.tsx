import type { Tab } from '../../types/tab';
import styles from './TabBar.module.css';

interface TabBarProps {
  tabs: Map<string, Tab>;
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
}: TabBarProps) {
  const tabArray = Array.from(tabs.values());

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabArray.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className={styles.tabTitle}>{tab.title}</span>
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className={styles.newTabButton}
        onClick={onNewTab}
        aria-label="New tab"
      >
        +
      </button>
    </div>
  );
}

export default TabBar;
