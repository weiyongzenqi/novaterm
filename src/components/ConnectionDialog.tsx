import { useState, useCallback } from 'react';
import type { SSHConfig, AuthConfig } from '../ssh';
import styles from './ConnectionDialog.module.css';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionDialog({ isOpen, onClose, onConnect }: ConnectionDialogProps) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [authType, setAuthType] = useState<'Password' | 'Key'>('Password');
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Invalid port number');
      setIsConnecting(false);
      return;
    }

    let auth: AuthConfig;
    if (authType === 'Password') {
      if (!password) {
        setError('Password is required');
        setIsConnecting(false);
        return;
      }
      auth = { type: 'Password', password };
    } else {
      if (!privateKeyPath) {
        setError('Private key path is required');
        setIsConnecting(false);
        return;
      }
      auth = { type: 'Key', private_key_path: privateKeyPath };
    }

    const config: SSHConfig = {
      host,
      port: portNum,
      username,
      auth,
    };

    try {
      onConnect(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  }, [host, port, username, authType, password, privateKeyPath, onConnect, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>New SSH Connection</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="host">Host</label>
            <input
              id="host"
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="hostname or IP"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="port">Port</label>
            <input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              min="1"
              max="65535"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="authType">Authentication</label>
            <select
              id="authType"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as 'Password' | 'Key')}
            >
              <option value="Password">Password</option>
              <option value="Key">Private Key</option>
            </select>
          </div>

          {authType === 'Password' && (
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                required={authType === 'Password'}
              />
            </div>
          )}

          {authType === 'Key' && (
            <div className={styles.field}>
              <label htmlFor="privateKeyPath">Private Key Path</label>
              <input
                id="privateKeyPath"
                type="text"
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
                placeholder="/path/to/private_key"
                required={authType === 'Key'}
              />
              <span className={styles.hint}>e.g., ~/.ssh/id_rsa</span>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.connectButton}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConnectionDialog;