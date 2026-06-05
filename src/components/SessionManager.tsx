import { useState, useCallback, useMemo } from 'react';
import type { SessionConfig } from '../config';
import styles from './SessionManager.module.css';

interface SessionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionConfig[];
  onConnect: (session: SessionConfig) => void;
  onAddSession: (session: Omit<SessionConfig, 'id'>) => Promise<SessionConfig>;
  onUpdateSession: (id: string, updates: Partial<SessionConfig>) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onImportSessions: (path: string) => Promise<SessionConfig[]>;
  onExportSessions: (sessions: SessionConfig[], path: string) => Promise<void>;
}

export function SessionManager({
  isOpen,
  onClose,
  sessions,
  onConnect,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onImportSessions,
  onExportSessions,
}: SessionManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<SessionConfig> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSession, setNewSession] = useState<Partial<SessionConfig>>({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(session =>
      session.name.toLowerCase().includes(query) ||
      session.host.toLowerCase().includes(query) ||
      session.username.toLowerCase().includes(query) ||
      (session.group && session.group.toLowerCase().includes(query))
    );
  }, [sessions, searchQuery]);

  // Group sessions by their group field
  const groupedSessions = useMemo(() => {
    const groups: Record<string, SessionConfig[]> = {};
    filteredSessions.forEach(session => {
      const group = session.group || 'Default';
      if (!groups[group]) groups[group] = [];
      groups[group].push(session);
    });
    return groups;
  }, [filteredSessions]);

  const handleConnect = useCallback((session: SessionConfig) => {
    onConnect(session);
    onClose();
  }, [onConnect, onClose]);

  const handleAddSession = useCallback(async () => {
    if (!newSession.name || !newSession.host || !newSession.username) {
      setError('Name, host, and username are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddSession({
        name: newSession.name,
        host: newSession.host,
        port: newSession.port || 22,
        username: newSession.username,
        authType: newSession.authType || 'password',
        privateKeyPath: newSession.privateKeyPath,
        group: newSession.group,
      });
      setIsAdding(false);
      setNewSession({
        name: '',
        host: '',
        port: 22,
        username: '',
        authType: 'password',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [newSession, onAddSession]);

  const handleUpdateSession = useCallback(async () => {
    if (!editingSession || !selectedSession) return;

    setLoading(true);
    setError(null);
    try {
      await onUpdateSession(selectedSession.id, editingSession);
      setIsEditing(false);
      setEditingSession(null);
      setSelectedSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [editingSession, selectedSession, onUpdateSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await onDeleteSession(id);
      setDeleteConfirmId(null);
      setSelectedSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [onDeleteSession]);

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never';
    const date = new Date(lastUsed);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.manager}>
        <div className={styles.header}>
          <h2>Session Manager</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button
            className={styles.addButton}
            onClick={() => {
              setIsAdding(true);
              setIsEditing(false);
              setSelectedSession(null);
            }}
          >
            + New Session
          </button>
          <button
            className={styles.importButton}
            onClick={() => {
              // In a real app, we'd use a file dialog
              // For now, prompt for path
              const path = prompt('Enter import file path:');
              if (path) {
                onImportSessions(path).catch(err => setError(err.message));
              }
            }}
          >
            Import
          </button>
          <button
            className={styles.exportButton}
            onClick={() => {
              const path = prompt('Enter export file path:');
              if (path) {
                onExportSessions(filteredSessions, path).catch(err => setError(err.message));
              }
            }}
          >
            Export
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Add Session Form */}
        {isAdding && (
          <div className={styles.formOverlay}>
            <div className={styles.form}>
              <h3>Add New Session</h3>
              <div className={styles.field}>
                <label>Name</label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  placeholder="Session name"
                />
              </div>
              <div className={styles.field}>
                <label>Host</label>
                <input
                  type="text"
                  value={newSession.host}
                  onChange={(e) => setNewSession({ ...newSession, host: e.target.value })}
                  placeholder="hostname or IP"
                />
              </div>
              <div className={styles.field}>
                <label>Port</label>
                <input
                  type="number"
                  value={newSession.port}
                  onChange={(e) => setNewSession({ ...newSession, port: parseInt(e.target.value, 10) })}
                  min="1"
                  max="65535"
                />
              </div>
              <div className={styles.field}>
                <label>Username</label>
                <input
                  type="text"
                  value={newSession.username}
                  onChange={(e) => setNewSession({ ...newSession, username: e.target.value })}
                  placeholder="username"
                />
              </div>
              <div className={styles.field}>
                <label>Auth Type</label>
                <select
                  value={newSession.authType}
                  onChange={(e) => setNewSession({ ...newSession, authType: e.target.value as 'password' | 'key' })}
                >
                  <option value="password">Password</option>
                  <option value="key">Private Key</option>
                </select>
              </div>
              {newSession.authType === 'key' && (
                <div className={styles.field}>
                  <label>Private Key Path</label>
                  <input
                    type="text"
                    value={newSession.privateKeyPath}
                    onChange={(e) => setNewSession({ ...newSession, privateKeyPath: e.target.value })}
                    placeholder="/path/to/private_key"
                  />
                </div>
              )}
              <div className={styles.field}>
                <label>Group</label>
                <input
                  type="text"
                  value={newSession.group}
                  onChange={(e) => setNewSession({ ...newSession, group: e.target.value })}
                  placeholder="Optional group name"
                />
              </div>
              <div className={styles.formActions}>
                <button onClick={() => setIsAdding(false)}>Cancel</button>
                <button onClick={handleAddSession} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Session Form */}
        {isEditing && editingSession && (
          <div className={styles.formOverlay}>
            <div className={styles.form}>
              <h3>Edit Session</h3>
              <div className={styles.field}>
                <label>Name</label>
                <input
                  type="text"
                  value={editingSession.name}
                  onChange={(e) => setEditingSession({ ...editingSession, name: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Host</label>
                <input
                  type="text"
                  value={editingSession.host}
                  onChange={(e) => setEditingSession({ ...editingSession, host: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Port</label>
                <input
                  type="number"
                  value={editingSession.port}
                  onChange={(e) => setEditingSession({ ...editingSession, port: parseInt(e.target.value, 10) })}
                  min="1"
                  max="65535"
                />
              </div>
              <div className={styles.field}>
                <label>Username</label>
                <input
                  type="text"
                  value={editingSession.username}
                  onChange={(e) => setEditingSession({ ...editingSession, username: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Auth Type</label>
                <select
                  value={editingSession.authType}
                  onChange={(e) => setEditingSession({ ...editingSession, authType: e.target.value as 'password' | 'key' })}
                >
                  <option value="password">Password</option>
                  <option value="key">Private Key</option>
                </select>
              </div>
              {editingSession.authType === 'key' && (
                <div className={styles.field}>
                  <label>Private Key Path</label>
                  <input
                    type="text"
                    value={editingSession.privateKeyPath}
                    onChange={(e) => setEditingSession({ ...editingSession, privateKeyPath: e.target.value })}
                  />
                </div>
              )}
              <div className={styles.field}>
                <label>Group</label>
                <input
                  type="text"
                  value={editingSession.group}
                  onChange={(e) => setEditingSession({ ...editingSession, group: e.target.value })}
                />
              </div>
              <div className={styles.formActions}>
                <button onClick={() => {
                  setIsEditing(false);
                  setEditingSession(null);
                }}>Cancel</button>
                <button onClick={handleUpdateSession} disabled={loading}>
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmDialog}>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this session?</p>
              <div className={styles.confirmActions}>
                <button onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteSession(deleteConfirmId)}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session List */}
        <div className={styles.sessionList}>
          {Object.entries(groupedSessions).map(([group, groupSessions]) => (
            <div key={group} className={styles.sessionGroup}>
              <h3 className={styles.groupTitle}>{group}</h3>
              <table className={styles.sessionTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Username</th>
                    <th>Last Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupSessions.map(session => (
                    <tr
                      key={session.id}
                      className={`${styles.sessionRow} ${selectedSession?.id === session.id ? styles.selected : ''}`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <td>{session.name}</td>
                      <td>{session.host}</td>
                      <td>{session.port}</td>
                      <td>{session.username}</td>
                      <td>{formatLastUsed(session.lastUsed)}</td>
                      <td className={styles.actions}>
                        <button
                          className={styles.connectAction}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(session);
                          }}
                        >
                          Connect
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                            setEditingSession({ ...session });
                            setIsEditing(true);
                            setIsAdding(false);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteAction}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(session.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {filteredSessions.length === 0 && (
            <div className={styles.empty}>
              {searchQuery ? 'No sessions found matching your search.' : 'No saved sessions. Click "+ New Session" to add one.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionManager;