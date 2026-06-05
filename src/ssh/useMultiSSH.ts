import { useCallback, useRef, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { SSHConfig, SSHStatus, SSHSessionEvent } from './types';

export interface SessionState {
  sessionId: string | null;
  status: SSHStatus;
  error: string | null;
}

export interface MultiSSHState {
  sessions: Map<string, SessionState>;
  connect: (tabId: string, config: SSHConfig) => Promise<string>;
  disconnect: (tabId: string) => Promise<void>;
  disconnectAll: () => Promise<void>;
  sendData: (tabId: string, data: string) => Promise<void>;
  resize: (tabId: string, cols: number, rows: number) => Promise<void>;
  acceptHostKey: (tabId: string) => Promise<void>;
  onOutput: (tabId: string, callback: (data: string) => void) => () => void;
  getSessionId: (tabId: string) => string | null;
  getStatus: (tabId: string) => SSHStatus;
  getError: (tabId: string) => string | null;
}

export function useMultiSSH(): MultiSSHState {
  const [sessions, setSessions] = useState<Map<string, SessionState>>(new Map());
  const outputCallbacksRef = useRef<Map<string, Set<(data: string) => void>>>(new Map());
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const sessionsRef = useRef<Map<string, SessionState>>(sessions);

  // Keep ref in sync with latest sessions
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Listen to SSH events from backend
  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await listen<SSHSessionEvent>('ssh-event', (event) => {
        const payload = event.payload;

        // Find which tab this session belongs to
        setSessions(prev => {
          const newMap = new Map(prev);
          for (const [tabId, state] of newMap.entries()) {
            if (state.sessionId === payload.sessionId) {
              switch (payload.type) {
                case 'connected':
                  newMap.set(tabId, { ...state, status: 'connected', error: null });
                  break;
                case 'output':
                  outputCallbacksRef.current.get(tabId)?.forEach(cb => cb(payload.data));
                  break;
                case 'closed':
                  // Keep existing error - only clear error on new connection attempt
                  const existingState = newMap.get(tabId);
                  newMap.set(tabId, {
                    sessionId: null,
                    status: 'disconnected',
                    error: existingState?.error || null
                  });
                  break;
                case 'error':
                  newMap.set(tabId, { ...state, status: 'disconnected', error: payload.message });
                  break;
                case 'hostKeyUnknown':
                  newMap.set(tabId, { ...state, error: `Unknown host key: ${payload.fingerprint}` });
                  break;
              }
              break;
            }
          }
          return newMap;
        });
      });
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const connect = useCallback(async (tabId: string, config: SSHConfig): Promise<string> => {
    setSessions(prev => {
      const newMap = new Map(prev);
      newMap.set(tabId, { sessionId: null, status: 'connecting', error: null });
      return newMap;
    });

    try {
      const cols = 80;
      const rows = 24;
      const invokePromise = invoke<string>('ssh_connect', {
        host: config.host,
        port: config.port,
        username: config.username,
        auth: config.auth,
        cols,
        rows,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout (15s)')), 15000);
      });

      const result = await Promise.race([invokePromise, timeoutPromise]);
      const sessionId = result;

      setSessions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(tabId);
        if (existing) {
          newMap.set(tabId, { ...existing, sessionId });
        }
        return newMap;
      });

      return sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // On timeout, try to disconnect any pending backend session
      // The backend may have started a session even if frontend timed out
      try {
        // Get any session that might have been created for this tab
        const state = sessionsRef.current.get(tabId);
        if (state?.sessionId) {
          await invoke('ssh_disconnect', { sessionId: state.sessionId });
        }
      } catch {
        // Ignore disconnect errors during cleanup
      }

      setSessions(prev => {
        const newMap = new Map(prev);
        newMap.set(tabId, { sessionId: null, status: 'disconnected', error: message });
        return newMap;
      });
      throw new Error(message);
    }
  }, []);

  const disconnect = useCallback(async (tabId: string) => {
    const state = sessionsRef.current.get(tabId);
    if (!state?.sessionId) return;

    try {
      await invoke('ssh_disconnect', { sessionId: state.sessionId });
      setSessions(prev => {
        const newMap = new Map(prev);
        newMap.set(tabId, { sessionId: null, status: 'disconnected', error: null });
        return newMap;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSessions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(tabId);
        if (existing) {
          newMap.set(tabId, { ...existing, error: message });
        }
        return newMap;
      });
    }
  }, []);

  const disconnectAll = useCallback(async () => {
    const disconnectPromises = Array.from(sessionsRef.current.entries())
      .filter(([, state]) => state.sessionId)
      .map(([tabId]) => disconnect(tabId));
    await Promise.all(disconnectPromises);
  }, [disconnect]);

  const sendData = useCallback(async (tabId: string, data: string) => {
    const state = sessionsRef.current.get(tabId);
    if (!state?.sessionId) return;
    const bytes = new TextEncoder().encode(data);
    await invoke('ssh_send_data', { sessionId: state.sessionId, data: Array.from(bytes) });
  }, []);

  const resize = useCallback(async (tabId: string, cols: number, rows: number) => {
    const state = sessionsRef.current.get(tabId);
    if (!state?.sessionId) return;
    await invoke('ssh_resize', { sessionId: state.sessionId, cols, rows });
  }, []);

  const acceptHostKey = useCallback(async (tabId: string) => {
    const state = sessionsRef.current.get(tabId);
    if (!state?.sessionId) return;
    await invoke('ssh_accept_host_key', { sessionId: state.sessionId });
  }, []);

  const onOutput = useCallback((tabId: string, callback: (data: string) => void) => {
    if (!outputCallbacksRef.current.has(tabId)) {
      outputCallbacksRef.current.set(tabId, new Set());
    }
    outputCallbacksRef.current.get(tabId)!.add(callback);
    return () => {
      outputCallbacksRef.current.get(tabId)?.delete(callback);
    };
  }, []);

  const getSessionId = useCallback((tabId: string): string | null => {
    return sessionsRef.current.get(tabId)?.sessionId || null;
  }, []);

  const getStatus = useCallback((tabId: string): SSHStatus => {
    return sessionsRef.current.get(tabId)?.status || 'disconnected';
  }, []);

  const getError = useCallback((tabId: string): string | null => {
    return sessionsRef.current.get(tabId)?.error || null;
  }, []);

  return {
    sessions,
    connect,
    disconnect,
    disconnectAll,
    sendData,
    resize,
    acceptHostKey,
    onOutput,
    getSessionId,
    getStatus,
    getError,
  };
}
