/**
 * SFTP related types.
 */

/** Remote file entry */
export interface RemoteEntry {
  name: string;
  full_path: string;
  is_dir: boolean;
  size: number;
  modified: number;
}

/** SFTP session event from backend */
export type SftpSessionEvent =
  | { type: 'Connected'; session_id: string }
  | { type: 'Entries'; session_id: string; path: string; entries: RemoteEntry[] }
  | { type: 'TransferProgress'; session_id: string; id: string; name: string; is_upload: boolean; transferred: number; total: number; state: number }
  | { type: 'Error'; session_id: string; message: string }
  | { type: 'Closed'; session_id: string }
  | { type: 'Status'; session_id: string; message: string };

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

/** Authentication configuration */
export type AuthConfig =
  | { type: 'Password'; password: string }
  | { type: 'Key'; private_key_path: string; passphrase?: string };
