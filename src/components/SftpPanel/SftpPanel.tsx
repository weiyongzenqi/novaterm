import { useState, useCallback, useEffect } from 'react';
import type { RemoteEntry } from '../../ssh';
import { t } from '../../i18n/zh';
import styles from './SftpPanel.module.css';

interface SftpPanelProps {
  entries: RemoteEntry[];
  currentPath: string;
  loading: boolean;
  error: string | null;
  statusMessage: string;
  onNavigate: (path: string) => void;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onDownload: (entry: RemoteEntry) => void;
  onUpload: () => void;
  onDelete: (entry: RemoteEntry) => void;
  onMkdir: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(timestamp: number): string {
  if (timestamp === 0) return '-';
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getFileIcon(entry: RemoteEntry): string {
  if (entry.isDir) return '📁';
  const ext = entry.name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    txt: '📄',
    md: '📝',
    js: '📜',
    ts: '📜',
    json: '📋',
    html: '🌐',
    css: '🎨',
    py: '🐍',
    rs: '🦀',
    go: '🔵',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    h: '📄',
    sh: '💻',
    zip: '📦',
    tar: '📦',
    gz: '📦',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    pdf: '📕',
    mp3: '🎵',
    mp4: '🎬',
  };
  return iconMap[ext] || '📄';
}

export function SftpPanel({
  entries,
  currentPath,
  loading,
  error,
  statusMessage,
  onNavigate,
  onNavigateUp,
  onRefresh,
  onDownload,
  onUpload,
  onDelete,
  onMkdir,
}: SftpPanelProps) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [addressInput, setAddressInput] = useState(currentPath);

  // Clear selections when directory changes
  useEffect(() => {
    setSelectedEntries(new Set());
  }, [currentPath]);

  const handleEntryDoubleClick = useCallback((entry: RemoteEntry) => {
    if (entry.isDir) {
      onNavigate(entry.fullPath);
    } else {
      onDownload(entry);
    }
  }, [onNavigate, onDownload]);

  const handleSelect = useCallback((entry: RemoteEntry, ctrlKey: boolean) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (ctrlKey) {
        if (newSet.has(entry.fullPath)) {
          newSet.delete(entry.fullPath);
        } else {
          newSet.add(entry.fullPath);
        }
      } else {
        newSet.clear();
        newSet.add(entry.fullPath);
      }
      return newSet;
    });
  }, []);

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(addressInput);
  }, [addressInput, onNavigate]);

  const handleDeleteSelected = useCallback(() => {
    selectedEntries.forEach(path => {
      const entry = entries.find(e => e.fullPath === path);
      if (entry) onDelete(entry);
    });
    setSelectedEntries(new Set());
  }, [selectedEntries, entries, onDelete]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarButton}
          onClick={onNavigateUp}
          disabled={currentPath === '/' || loading}
          title={t('sftp.parentDir')}
        >
          ⬆️
        </button>
        <button
          className={styles.toolbarButton}
          onClick={onRefresh}
          disabled={loading}
          title={t('sftp.refresh')}
        >
          🔄
        </button>
        <div className={styles.separator} />
        <button
          className={styles.toolbarButton}
          onClick={onUpload}
          disabled={loading}
          title={t('sftp.upload')}
        >
          ⬆️ {t('sftp.upload')}
        </button>
        <button
          className={styles.toolbarButton}
          onClick={() => {
            const selected = Array.from(selectedEntries);
            if (selected.length > 0) {
              const entry = entries.find(e => e.fullPath === selected[0]);
              if (entry && !entry.isDir) onDownload(entry);
            }
          }}
          disabled={selectedEntries.size === 0 || loading}
          title={t('sftp.download')}
        >
          ⬇️ {t('sftp.download')}
        </button>
        <button
          className={styles.toolbarButton}
          onClick={handleDeleteSelected}
          disabled={selectedEntries.size === 0 || loading}
          title={t('sftp.delete')}
        >
          🗑️ {t('sftp.delete')}
        </button>
        <button
          className={styles.toolbarButton}
          onClick={onMkdir}
          disabled={loading}
          title={t('sftp.newFolder')}
        >
          📁 {t('sftp.newFolder')}
        </button>
      </div>

      <form className={styles.addressBar} onSubmit={handleAddressSubmit}>
        <div className={styles.breadcrumbs}>
          <button
            type="button"
            className={styles.breadcrumb}
            onClick={() => onNavigate('/')}
          >
            /
          </button>
          {breadcrumbs.map((part, index) => {
            const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
            return (
              <span key={path}>
                <span className={styles.breadcrumbSeparator}>/</span>
                <button
                  type="button"
                  className={styles.breadcrumb}
                  onClick={() => onNavigate(path)}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>
        <input
          type="text"
          className={styles.addressInput}
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onBlur={() => setAddressInput(currentPath)}
          placeholder="/path/to/directory"
        />
      </form>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {statusMessage && !error && (
        <div className={styles.status}>{statusMessage}</div>
      )}

      <div className={styles.fileList}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colName}>{t('sftp.name')}</th>
              <th className={styles.colSize}>{t('sftp.size')}</th>
              <th className={styles.colModified}>{t('sftp.modified')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className={styles.loading}>{t('common.loading')}</td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.empty}>{t('sftp.emptyDir')}</td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr
                key={entry.fullPath}
                className={`${styles.row} ${selectedEntries.has(entry.fullPath) ? styles.selected : ''} ${entry.isDir ? styles.directory : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(entry, e.ctrlKey || e.metaKey);
                }}
                onDoubleClick={() => handleEntryDoubleClick(entry)}
              >
                <td className={styles.colName}>
                  <span className={styles.icon}>{getFileIcon(entry)}</span>
                  <span className={styles.name}>{entry.name}</span>
                </td>
                <td className={styles.colSize}>
                  {entry.isDir ? '-' : formatSize(entry.size)}
                </td>
                <td className={styles.colModified}>
                  {formatDate(entry.modified)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SftpPanel;
