/**
 * SSH connection types.
 */

/** Authentication configuration */
export type AuthConfig =
  | { type: 'Password'; password: string }
  | { type: 'Key'; private_key_path: string; passphrase?: string };

/** SSH connection configuration */
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  auth: AuthConfig;
}

/** SSH session status */
export type SSHStatus = 'disconnected' | 'connecting' | 'connected';

/** SSH session event from backend */
export type SSHSessionEvent =
  | { type: 'Connected'; session_id: string }
  | { type: 'Output'; session_id: string; data: string }
  | { type: 'Closed'; session_id: string; reason: string }
  | { type: 'Error'; session_id: string; message: string }
  | { type: 'HostKeyUnknown'; session_id: string; host: string; fingerprint: string };

/** SSH hook return type */
export interface UseSSHReturn {
  /** Current connection status */
  status: SSHStatus;
  /** Current error message */
  error: string | null;
  /** Current session ID */
  sessionId: string | null;
  /** Connect to server */
  connect: (config: SSHConfig) => Promise<string>;
  /** Disconnect from server */
  disconnect: () => Promise<void>;
  /** Send data to server */
  sendData: (data: string) => Promise<void>;
  /** Send raw bytes to server */
  sendDataRaw: (data: Uint8Array) => Promise<void>;
  /** Resize terminal */
  resize: (cols: number, rows: number) => Promise<void>;
  /** Accept unknown host key */
  acceptHostKey: () => Promise<void>;
  /** Register callback for output data */
  onOutput: (callback: (data: string) => void) => () => void;
}
