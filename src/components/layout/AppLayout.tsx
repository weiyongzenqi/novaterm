import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { StatusBar } from './StatusBar';
import { TerminalArea } from './TerminalArea';
import { SftpPanel } from '../SftpPanel';
import { ConnectionDialog } from '../ConnectionDialog';
import { SessionManager } from '../SessionManager';
import { useTabManager } from '../../hooks/useTabManager';
import { useMultiSSH, useSFTP } from '../../ssh';
import { useConfig } from '../../config';
import type { SSHConfig, RemoteEntry } from '../../ssh';
import type { SessionConfig } from '../../config';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { tabs, activeTabId, addTab, removeTab, switchTab } = useTabManager();
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
  const [showSftpPanel, setShowSftpPanel] = useState(false);

  // Configuration management
  const {
    config,
    loading: configLoading,
    addSession,
    updateSession,
    deleteSession,
    importSessions,
    exportSessions,
  } = useConfig();

  // Store SSH configs for each tab to enable SFTP connection
  const sshConfigsRef = useRef<Map<string, SSHConfig>>(new Map());

  const {
    connect,
    disconnect,
    sendData,
    resize,
    onOutput,
    getStatus,
    getError,
    getSessionId,
  } = useMultiSSH();

  // Get active tab's SSH config for SFTP
  const activeConfig = activeTabId ? sshConfigsRef.current.get(activeTabId) : null;
  const activeSessionId = activeTabId ? getSessionId(activeTabId) : null;

  const sftp = useSFTP(activeSessionId);

  // Auto-connect SFTP when SSH session is connected
  useEffect(() => {
    if (showSftpPanel && activeConfig && sftp.status === 'disconnected') {
      sftp.connect(activeConfig).catch(() => {
        // Error handled by hook
      });
    }
  }, [showSftpPanel, activeConfig, sftp.status, sftp.connect]);

  // Handle new connection from dialog
  const handleConnect = useCallback(async (config: SSHConfig) => {
    const tabId = addTab(`${config.username}@${config.host}`);

    // Store config for SFTP use
    sshConfigsRef.current.set(tabId, config);

    try {
      await connect(tabId, config);
    } catch (err) {
      // Error is handled by useMultiSSH
    }
  }, [addTab, connect]);

  // Handle connection from saved session
  const handleSessionConnect = useCallback(async (session: SessionConfig) => {
    // Convert session config to SSH config
    // Note: Password is not stored, so user needs to input it
    const sshConfig: SSHConfig = {
      host: session.host,
      port: session.port,
      username: session.username,
      auth: session.authType === 'key'
        ? { type: 'Key', private_key_path: session.privateKeyPath || '' }
        : { type: 'Password', password: '' }, // Empty password - user must input
    };

    // If password auth, open connection dialog with pre-filled values
    if (session.authType === 'password') {
      // Open ConnectionDialog with session data pre-filled
      // For now, we'll prompt for password via the dialog
      // A better approach would be to pre-fill the dialog
      setIsConnectionDialogOpen(true);
      // Note: ConnectionDialog currently doesn't support pre-filled values
      // This is a limitation that could be improved in future
    } else {
      // Key auth - can connect directly if key path is set
      handleConnect(sshConfig);
    }

    // Update session lastUsed timestamp
    updateSession(session.id, { lastUsed: new Date().toISOString() });
  }, [handleConnect, updateSession]);

  // Handle tab close - disconnect SSH if connected
  const handleTabClose = useCallback(async (tabId: string) => {
    await disconnect(tabId);
    sshConfigsRef.current.delete(tabId);
    removeTab(tabId);
  }, [disconnect, removeTab]);

  // Handle send data to SSH
  const handleSendData = useCallback((tabId: string, data: string) => {
    sendData(tabId, data);
  }, [sendData]);

  // Handle terminal resize
  const handleResize = useCallback((tabId: string, cols: number, rows: number) => {
    resize(tabId, cols, rows);
  }, [resize]);

  // Build connection status map for TerminalArea
  const connectionStatus = new Map<string, 'disconnected' | 'connecting' | 'connected'>();
  const connectionErrors = new Map<string, string>();

  tabs.forEach((_, tabId) => {
    connectionStatus.set(tabId, getStatus(tabId));
    const error = getError(tabId);
    if (error) {
      connectionErrors.set(tabId, error);
    }
  });

  // Handle new tab button click
  const handleNewTab = useCallback(() => {
    setIsConnectionDialogOpen(true);
  }, []);

  // SFTP handlers
  const handleSftpNavigate = useCallback((path: string) => {
    sftp.listDir(path);
  }, [sftp]);

  const handleSftpNavigateUp = useCallback(() => {
    sftp.navigateUp();
  }, [sftp]);

  const handleSftpRefresh = useCallback(() => {
    sftp.refresh();
  }, [sftp]);

  const handleSftpDownload = useCallback(async (_entry: RemoteEntry) => {
    // Note: In a real implementation, we would use a file picker
    // For now, download to a temp directory
    // eslint-disable-next-line no-console
    console.log('Download:', _entry.name);
  }, []);

  const handleSftpUpload = useCallback(async () => {
    // Note: In a real implementation, we would use a file picker
    // For now, placeholder
    // eslint-disable-next-line no-console
    console.log('Upload triggered');
  }, []);

  const handleSftpDelete = useCallback(async (entry: RemoteEntry) => {
    sftp.deleteFile(entry.full_path);
  }, [sftp]);

  const handleSftpMkdir = useCallback(async () => {
    // Note: In a real implementation, we would prompt for name
    const name = 'new_folder';
    const path = `${sftp.currentPath}/${name}`;
    sftp.mkdir(path);
  }, [sftp]);

  // Toggle SFTP panel
  const handleToggleSftp = useCallback(() => {
    setShowSftpPanel(prev => !prev);
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar
        onNewConnection={() => setIsConnectionDialogOpen(true)}
        sessions={configLoading ? [] : config.sessions}
        onSessionClick={handleSessionConnect}
        onManageSessions={() => setIsSessionManagerOpen(true)}
      />
      <div className={styles.main}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={switchTab}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
        />
        <div className={styles.content}>
          <TerminalArea
            tabs={tabs}
            activeTabId={activeTabId}
            connectionStatus={connectionStatus}
            connectionErrors={connectionErrors}
            onSendData={handleSendData}
            onResize={handleResize}
            onOutput={onOutput}
          />
          {showSftpPanel && activeConfig && (
            <div className={styles.sftpContainer}>
              <div className={styles.sftpHeader}>
                <span>SFTP - {activeConfig.username}@{activeConfig.host}</span>
                <button className={styles.closeButton} onClick={() => setShowSftpPanel(false)}>
                  ✕
                </button>
              </div>
              <SftpPanel
                entries={sftp.entries}
                currentPath={sftp.currentPath}
                loading={sftp.loading}
                error={sftp.error}
                statusMessage={sftp.statusMessage}
                onNavigate={handleSftpNavigate}
                onNavigateUp={handleSftpNavigateUp}
                onRefresh={handleSftpRefresh}
                onDownload={handleSftpDownload}
                onUpload={handleSftpUpload}
                onDelete={handleSftpDelete}
                onMkdir={handleSftpMkdir}
              />
            </div>
          )}
        </div>
        <StatusBar>
          <button
            className={styles.sftpToggle}
            onClick={handleToggleSftp}
            title={showSftpPanel ? 'Hide SFTP Panel' : 'Show SFTP Panel'}
          >
            📁 {showSftpPanel ? 'Hide SFTP' : 'SFTP'}
          </button>
        </StatusBar>
      </div>
      <ConnectionDialog
        isOpen={isConnectionDialogOpen}
        onClose={() => setIsConnectionDialogOpen(false)}
        onConnect={handleConnect}
      />
      <SessionManager
        isOpen={isSessionManagerOpen}
        onClose={() => setIsSessionManagerOpen(false)}
        sessions={config.sessions}
        onConnect={handleSessionConnect}
        onAddSession={addSession}
        onUpdateSession={updateSession}
        onDeleteSession={deleteSession}
        onImportSessions={importSessions}
        onExportSessions={exportSessions}
      />
    </div>
  );
}

export default AppLayout;