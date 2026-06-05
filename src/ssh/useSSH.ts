import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { SSHConfig, SSHStatus, SSHSessionEvent, UseSSHReturn } from './types';

/**
 * React hook for SSH connection management.
 */
export function useSSH(): UseSSHReturn {
  const [status, setStatus] = useState<SSHStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const outputCallbacksRef = useRef<Set<(data: string) => void>>(new Set());
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Listen to SSH events from backend
  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await listen<SSHSessionEvent>('ssh-event', (event) => {
        const payload = event.payload;
        if (payload.sessionId !== sessionId) return;

        switch (payload.type) {
          case 'Connected':
            setStatus('connected');
            setError(null);
            break;
          case 'Output':
            outputCallbacksRef.current.forEach(cb => cb(payload.data));
            break;
          case 'Closed':
            setStatus('disconnected');
            setSessionId(null);
            break;
          case 'Error':
            setError(payload.message);
            setStatus('disconnected');
            break;
          case 'HostKeyUnknown':
            // Handle host key verification (show dialog)
            setError(`Unknown host key: ${payload.fingerprint}`);
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
  }, [sessionId]);

  const connect = useCallback(async (config: SSHConfig): Promise<string> => {
    setStatus('connecting');
    setError(null);

    try {
      const cols = 80;
      const rows = 24;
      const id = await invoke<string>('ssh_connect', {
        host: config.host,
        port: config.port,
        username: config.username,
        auth: config.auth,
        cols,
        rows,
      });
      setSessionId(id);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('disconnected');
      throw new Error(message);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!sessionId) return;

    try {
      await invoke('ssh_disconnect', { sessionId });
      setStatus('disconnected');
      setSessionId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [sessionId]);

  const sendData = useCallback(async (data: string) => {
    if (!sessionId) return;
    const bytes = new TextEncoder().encode(data);
    await invoke('ssh_send_data', { sessionId, data: Array.from(bytes) });
  }, [sessionId]);

  const sendDataRaw = useCallback(async (data: Uint8Array) => {
    if (!sessionId) return;
    await invoke('ssh_send_data', { sessionId, data: Array.from(data) });
  }, [sessionId]);

  const resize = useCallback(async (cols: number, rows: number) => {
    if (!sessionId) return;
    await invoke('ssh_resize', { sessionId, cols, rows });
  }, [sessionId]);

  const acceptHostKey = useCallback(async () => {
    if (!sessionId) return;
    await invoke('ssh_accept_host_key', { sessionId });
  }, [sessionId]);

  const onOutput = useCallback((callback: (data: string) => void) => {
    outputCallbacksRef.current.add(callback);
    return () => {
      outputCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    status,
    error,
    sessionId,
    connect,
    disconnect,
    sendData,
    sendDataRaw,
    resize,
    acceptHostKey,
    onOutput,
  };
}