/**
 * SFTP related types.
 */

import type { AuthConfig } from './types';

export type { AuthConfig };

/** Remote file entry */
export interface RemoteEntry {
  name: string;
  fullPath: string;
  isDir: boolean;
  size: number;
  modified: number;
}

/** SFTP session event from backend */
export type SftpSessionEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'entries'; sessionId: string; path: string; entries: RemoteEntry[] }
  | { type: 'transferProgress'; sessionId: string; id: string; name: string; isUpload: boolean; transferred: number; total: number; state: number }
  | { type: 'error'; sessionId: string; message: string }
  | { type: 'closed'; sessionId: string }
  | { type: 'status'; sessionId: string; message: string };

/** SFTP connection status */
export type SftpStatus = 'disconnected' | 'connecting' | 'connected';

/** useSFTP hook return type */
export interface UseSFTPReturn {
  /** Current connection status */
  status: SftpStatus;
  /** Current error message */
  error: string | null;
  /** Current SFTP session ID */
  sftpSessionId: string | null;
  /** Current directory path */
  currentPath: string;
  /** Current directory entries */
  entries: RemoteEntry[];
  /** Status message */
  statusMessage: string;
  /** Loading state */
  loading: boolean;
  /** Connect to SFTP server */
  connect: (config: SftpConfig) => Promise<string>;
  /** Disconnect from SFTP server */
  disconnect: () => Promise<void>;
  /** List directory contents */
  listDir: (path: string) => Promise<void>;
  /** Download a file */
  download: (remotePath: string, localDir: string) => Promise<void>;
  /** Upload a file */
  upload: (localPath: string, remoteDir: string) => Promise<void>;
  /** Delete a file or empty directory */
  deleteFile: (path: string) => Promise<void>;
  /** Create a directory */
  mkdir: (path: string) => Promise<void>;
  /** Navigate to a path */
  navigateTo: (path: string) => void;
  /** Navigate up one level */
  navigateUp: () => void;
  /** Refresh current directory */
  refresh: () => void;
}

/** SFTP connection configuration */
export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  auth: AuthConfig;
}
