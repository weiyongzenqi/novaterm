/**
 * Session configuration types for NovaTerm.
 * Sessions are persisted to JSON config but passwords are never stored (security).
 */

/**
 * Authentication type for SSH connection.
 */
export type AuthType = 'password' | 'key';

/**
 * Saved session configuration.
 * Note: Passwords are NOT stored for security reasons.
 */
export interface SessionConfig {
  /** Unique identifier for the session */
  id: string;
  /** Display name for the session */
  name: string;
  /** Hostname or IP address */
  host: string;
  /** SSH port (default: 22) */
  port: number;
  /** SSH username */
  username: string;
  /** Authentication method */
  authType: AuthType;
  /** Path to private key file (only when authType is 'key') */
  privateKeyPath?: string;
  /** ISO timestamp of last connection */
  lastUsed?: string;
  /** Optional group name for organizing sessions */
  group?: string;
}

/**
 * Application-wide configuration.
 */
export interface AppConfig {
  /** List of saved sessions */
  sessions: SessionConfig[];
  /** Currently active theme name */
  activeTheme: string;
  /** Default download directory for SFTP */
  downloadDir: string;
  /** Terminal font size in pixels */
  terminalFontSize: number;
  /** Terminal font family */
  terminalFontFamily: string;
}

/**
 * Default application configuration values.
 */
export const DEFAULT_CONFIG: AppConfig = {
  sessions: [],
  activeTheme: 'dracula',
  downloadDir: '',
  terminalFontSize: 14,
  terminalFontFamily: 'monospace',
};

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
