/**
 * SSH connection types.
 */

/** Authentication configuration */
export type AuthConfig =
  | { type: 'password'; password: string }
  | { type: 'key'; privateKeyPath: string; passphrase?: string };

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
  | { type: 'connected'; sessionId: string }
  | { type: 'output'; sessionId: string; data: string }
  | { type: 'closed'; sessionId: string; reason: string }
  | { type: 'error'; sessionId: string; message: string }
  | { type: 'hostKeyUnknown'; sessionId: string; host: string; fingerprint: string };

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
