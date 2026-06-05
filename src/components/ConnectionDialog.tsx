import { useState, useCallback, useEffect } from 'react';
import type { SSHConfig, AuthConfig } from '../ssh';
import { t } from '../i18n/zh';
import styles from './ConnectionDialog.module.css';

export interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: SSHConfig) => Promise<void> | void;
  initialConfig?: {
    host?: string;
    port?: number;
    username?: string;
    authType?: 'password' | 'key';
  };
}

export function ConnectionDialog({ isOpen, onClose, onConnect, initialConfig }: ConnectionDialogProps) {
  const [host, setHost] = useState(initialConfig?.host || 'localhost');
  const [port, setPort] = useState(String(initialConfig?.port || 22));
  const [username, setUsername] = useState(initialConfig?.username || '');
  const [authType, setAuthType] = useState<'Password' | 'Key'>(
    initialConfig?.authType === 'key' ? 'Key' : 'Password'
  );
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  // Sync initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setHost(initialConfig.host || 'localhost');
      setPort(String(initialConfig.port || 22));
      setUsername(initialConfig.username || '');
      setAuthType(initialConfig.authType === 'key' ? 'Key' : 'Password');
      setPassword('');         // Reset password when switching sessions
      setPrivateKeyPath('');   // Reset private key path when switching sessions
    }
  }, [initialConfig]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError(t('validation.invalidPort'));
      setIsConnecting(false);
      return;
    }

    let auth: AuthConfig;
    if (authType === 'Password') {
      if (!password) {
        setError(t('validation.passwordRequired'));
        setIsConnecting(false);
        return;
      }
      auth = { type: 'Password', password };
    } else {
      if (!privateKeyPath) {
        setError(t('validation.keyPathRequired'));
        setIsConnecting(false);
        return;
      }
      auth = { type: 'Key', privateKeyPath: privateKeyPath };
    }

    const config: SSHConfig = {
      host,
      port: portNum,
      username,
      auth,
    };

    try {
      await onConnect(config);
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
          <h2>{t('dialog.newConnection')}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="host">{t('dialog.host')}</label>
            <input
              id="host"
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={t('placeholder.hostname')}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="port">{t('dialog.port')}</label>
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
            <label htmlFor="username">{t('dialog.username')}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('placeholder.username')}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="authType">{t('dialog.authentication')}</label>
            <select
              id="authType"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as 'Password' | 'Key')}
            >
              <option value="Password">{t('auth.password')}</option>
              <option value="Key">{t('auth.privateKey')}</option>
            </select>
          </div>

          {authType === 'Password' && (
            <div className={styles.field}>
              <label htmlFor="password">{t('dialog.password')}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              placeholder={t('placeholder.password')}
                required={authType === 'Password'}
              />
            </div>
          )}

          {authType === 'Key' && (
            <div className={styles.field}>
              <label htmlFor="privateKeyPath">{t('dialog.privateKeyPath')}</label>
              <input
                id="privateKeyPath"
                type="text"
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
              placeholder={t('placeholder.keyPath')}
                required={authType === 'Key'}
              />
              <span className={styles.hint}>{t('placeholder.keyHint')}</span>
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={styles.connectButton}
              disabled={isConnecting}
            >
              {isConnecting ? t('status.connecting') : t('dialog.connect')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConnectionDialog;