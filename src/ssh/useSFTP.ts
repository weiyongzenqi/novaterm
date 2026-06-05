import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { SftpSessionEvent, SftpStatus, RemoteEntry, SftpConfig, UseSFTPReturn } from './sftpTypes';

/**
 * React hook for SFTP file management.
 */
export function useSFTP(_sshSessionId: string | null): UseSFTPReturn {
  const [status, setStatus] = useState<SftpStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [sftpSessionId, setSftpSessionId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sftpSessionIdRef = useRef<string | null>(null);

  // Keep ref in sync with latest sftpSessionId
  useEffect(() => {
    sftpSessionIdRef.current = sftpSessionId;
  }, [sftpSessionId]);

  // Cleanup: disconnect SFTP on unmount
  useEffect(() => {
    return () => {
      if (sftpSessionIdRef.current) {
        invoke('sftp_disconnect', { sessionId: sftpSessionIdRef.current }).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await listen<SftpSessionEvent>('sftp-event', (event) => {
        const payload = event.payload;
        if (payload.sessionId !== sftpSessionIdRef.current) return;

        switch (payload.type) {
          case 'connected':
            setStatus('connected');
            setError(null);
            setLoading(false);
            break;
          case 'entries':
            setCurrentPath(payload.path);
            setEntries(payload.entries);
            setLoading(false);
            break;
          case 'error':
            setError(payload.message);
            setLoading(false);
            break;
          case 'closed':
            setStatus('disconnected');
            setSftpSessionId(null);
            setEntries([]);
            setLoading(false);
            break;
          case 'status':
            setStatusMessage(payload.message);
            break;
          case 'transferProgress':
            // Handle transfer progress if needed
            break;
        }
      });
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const connect = useCallback(async (config: SftpConfig): Promise<string> => {
    setStatus('connecting');
    setError(null);
    setLoading(true);

    try {
      const id = await invoke<string>('sftp_connect', {
        host: config.host,
        port: config.port,
        username: config.username,
        auth: config.auth,
      });
      setSftpSessionId(id);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('disconnected');
      setLoading(false);
      throw new Error(message);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!sftpSessionId) return;

    try {
      await invoke('sftp_disconnect', { sessionId: sftpSessionId });
      setStatus('disconnected');
      setSftpSessionId(null);
      setEntries([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [sftpSessionId]);

  const listDir = useCallback(async (path: string) => {
    if (!sftpSessionId) return;
    setLoading(true);
    try {
      await invoke('sftp_list_dir', { sessionId: sftpSessionId, path });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [sftpSessionId]);

  const download = useCallback(async (remotePath: string, localDir: string) => {
    if (!sftpSessionId) return;
    setLoading(true);
    try {
      await invoke('sftp_download', {
        sessionId: sftpSessionId,
        remotePath,
        localDir,
      });
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [sftpSessionId]);

  const upload = useCallback(async (localPath: string, remoteDir: string) => {
    if (!sftpSessionId) return;
    setLoading(true);
    try {
      await invoke('sftp_upload', {
        sessionId: sftpSessionId,
        localPath,
        remoteDir,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [sftpSessionId]);

  const deleteFile = useCallback(async (path: string) => {
    if (!sftpSessionId) return;
    setLoading(true);
    try {
      await invoke('sftp_delete', { sessionId: sftpSessionId, path });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [sftpSessionId]);

  const mkdir = useCallback(async (path: string) => {
    if (!sftpSessionId) return;
    setLoading(true);
    try {
      await invoke('sftp_mkdir', { sessionId: sftpSessionId, path });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [sftpSessionId]);

  const navigateTo = useCallback((path: string) => {
    listDir(path);
  }, [listDir]);

  const navigateUp = useCallback(() => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    listDir(parentPath);
  }, [currentPath, listDir]);

  const refresh = useCallback(() => {
    listDir(currentPath);
  }, [currentPath, listDir]);

  return {
    status,
    error,
    sftpSessionId,
    currentPath,
    entries,
    statusMessage,
    loading,
    connect,
    disconnect,
    listDir,
    download,
    upload,
    deleteFile,
    mkdir,
    navigateTo,
    navigateUp,
    refresh,
  };
}
