import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { t } from '../i18n/zh';
import styles from './HostKeyConfirm.module.css';

interface HostKeyUnknownPayload {
  type: string;
  sessionId: string;
  host: string;
  fingerprint: string;
}

interface PendingHostKey {
  sessionId: string;
  host: string;
  fingerprint: string;
}

export function HostKeyConfirm() {
  const [pendingKeys, setPendingKeys] = useState<Map<string, PendingHostKey>>(new Map());

  useEffect(() => {
    const unlisten = listen<HostKeyUnknownPayload>('ssh-event', (event) => {
      const payload = event.payload;
      if (payload.type === 'hostKeyUnknown') {
        setPendingKeys(prev => {
          const newMap = new Map(prev);
          newMap.set(payload.sessionId, {
            sessionId: payload.sessionId,
            host: payload.host,
            fingerprint: payload.fingerprint,
          });
          return newMap;
        });
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Get the first pending key to display
  const currentPending = pendingKeys.size > 0
    ? Array.from(pendingKeys.values())[0]
    : null;

  const handleAccept = async () => {
    if (!currentPending) return;
    try {
      await invoke('ssh_accept_host_key', { sessionId: currentPending.sessionId });
    } catch (err) {
      console.error('accept host key failed:', err);
    }
    setPendingKeys(prev => {
      const newMap = new Map(prev);
      newMap.delete(currentPending.sessionId);
      return newMap;
    });
  };

  const handleReject = async () => {
    if (!currentPending) return;
    try {
      await invoke('ssh_reject_host_key', { sessionId: currentPending.sessionId });
    } catch (err) {
      console.error('reject host key failed:', err);
    }
    setPendingKeys(prev => {
      const newMap = new Map(prev);
      newMap.delete(currentPending.sessionId);
      return newMap;
    });
  };

  if (!currentPending) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>🔑 {t('hostKey.title')}</h2>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>
            {t('hostKey.message').replace('{host}', currentPending.host)}
          </p>
          <div className={styles.fingerprint}>
            <span className={styles.label}>{t('hostKey.fingerprint')}:</span>
            <code className={styles.code}>{currentPending.fingerprint}</code>
          </div>
          <p className={styles.warning}>{t('hostKey.warning')}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.rejectButton} onClick={handleReject}>
            {t('hostKey.reject')}
          </button>
          <button className={styles.acceptButton} onClick={handleAccept}>
            {t('hostKey.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HostKeyConfirm;
