/**
 * Configuration management hook for NovaTerm.
 * Handles loading, saving, and CRUD operations for sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SessionConfig, AppConfig } from './types';
import { DEFAULT_CONFIG, generateSessionId } from './types';
import { parseAppConfig, validateSessionConfigs } from './schema';

/**
 * Hook return type.
 */
interface UseConfigReturn {
  /** Current application configuration */
  config: AppConfig;
  /** Whether config is currently loading */
  loading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Reload configuration from disk */
  reload: () => Promise<void>;
  /** Save configuration to disk */
  save: (config: AppConfig) => Promise<void>;
  /** Add a new session */
  addSession: (session: Omit<SessionConfig, 'id'>) => Promise<SessionConfig>;
  /** Update an existing session */
  updateSession: (id: string, updates: Partial<SessionConfig>) => Promise<void>;
  /** Delete a session by ID */
  deleteSession: (id: string) => Promise<void>;
  /** Get a session by ID */
  getSession: (id: string) => SessionConfig | undefined;
  /** Import sessions from a JSON file */
  importSessions: (path: string) => Promise<SessionConfig[]>;
  /** Export sessions to a JSON file */
  exportSessions: (sessions: SessionConfig[], path: string) => Promise<void>;
  /** Update theme preference */
  setTheme: (themeName: string) => Promise<void>;
  /** Update terminal settings */
  setTerminalSettings: (fontSize: number, fontFamily: string) => Promise<void>;
}

/**
 * Configuration management hook.
 */
export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load configuration from backend.
   */
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<unknown>('load_config');
      const parsed = parseAppConfig(data);
      setConfig(parsed);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError(err instanceof Error ? err.message : String(err));
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save configuration to backend.
   */
  const saveConfig = useCallback(async (newConfig: AppConfig) => {
    setError(null);
    try {
      await invoke('save_config', { config: newConfig });
      setConfig(newConfig);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  /**
   * Add a new session.
   */
  const addSession = useCallback(async (sessionData: Omit<SessionConfig, 'id'>): Promise<SessionConfig> => {
    const newSession: SessionConfig = {
      ...sessionData,
      id: generateSessionId(),
    };
    // Calculate new config
    const newConfig = {
      ...config,
      sessions: [...config.sessions, newSession],
    };
    // Update state
    setConfig(newConfig);
    // Save to disk (async, don't wait)
    saveConfig(newConfig).catch(err => {
      console.error('Failed to save config after addSession:', err);
    });
    return newSession;
  }, [config, saveConfig]);

  /**
   * Update an existing session.
   */
  const updateSession = useCallback(async (id: string, updates: Partial<SessionConfig>) => {
    const newSessions = config.sessions.map(session =>
      session.id === id ? { ...session, ...updates } : session
    );
    const newConfig = { ...config, sessions: newSessions };
    // Update state
    setConfig(newConfig);
    // Save to disk (async, don't wait)
    saveConfig(newConfig).catch(err => {
      console.error('Failed to save config after updateSession:', err);
    });
  }, [config, saveConfig]);

  /**
   * Delete a session by ID.
   */
  const deleteSession = useCallback(async (id: string) => {
    const newSessions = config.sessions.filter(session => session.id !== id);
    const newConfig = { ...config, sessions: newSessions };
    // Update state
    setConfig(newConfig);
    // Save to disk (async, don't wait)
    saveConfig(newConfig).catch(err => {
      console.error('Failed to save config after deleteSession:', err);
    });
  }, [config, saveConfig]);

  /**
   * Get a session by ID.
   */
  const getSession = useCallback((id: string): SessionConfig | undefined => {
    return config.sessions.find(session => session.id === id);
  }, [config]);

  /**
   * Import sessions from a JSON file.
   */
  const importSessions = useCallback(async (path: string): Promise<SessionConfig[]> => {
    try {
      const sessions = await invoke<SessionConfig[]>('import_sessions', { path });
      if (!validateSessionConfigs(sessions)) {
        throw new Error('Invalid session data in import file');
      }
      // Generate new IDs for imported sessions to avoid conflicts
      const newSessions = sessions.map(session => ({
        ...session,
        id: generateSessionId(),
      }));
      const mergedConfig = {
        ...config,
        sessions: [...config.sessions, ...newSessions],
      };
      await saveConfig(mergedConfig);
      return newSessions;
    } catch (err) {
      console.error('Failed to import sessions:', err);
      throw err;
    }
  }, [config, saveConfig]);

  /**
   * Export sessions to a JSON file.
   */
  const exportSessions = useCallback(async (sessions: SessionConfig[], path: string) => {
    try {
      await invoke('export_sessions', { sessions, path });
    } catch (err) {
      console.error('Failed to export sessions:', err);
      throw err;
    }
  }, []);

  /**
   * Update theme preference.
   */
  const setTheme = useCallback(async (themeName: string) => {
    await saveConfig({ ...config, activeTheme: themeName });
  }, [config, saveConfig]);

  /**
   * Update terminal settings.
   */
  const setTerminalSettings = useCallback(async (fontSize: number, fontFamily: string) => {
    await saveConfig({ ...config, terminalFontSize: fontSize, terminalFontFamily: fontFamily });
  }, [config, saveConfig]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    reload: loadConfig,
    save: saveConfig,
    addSession,
    updateSession,
    deleteSession,
    getSession,
    importSessions,
    exportSessions,
    setTheme,
    setTerminalSettings,
  };
}

export default useConfig;
