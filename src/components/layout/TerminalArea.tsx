import { useRef, useCallback, useEffect } from 'react';
import { Terminal } from '../../terminal';
import { toXtermTheme, useTheme } from '../../themes';
import { t } from '../../i18n/zh';
import type { Tab } from '../../types/tab';
import type { TerminalHandle } from '../../terminal';
import styles from './TerminalArea.module.css';

interface TerminalAreaProps {
  tabs: Map<string, Tab>;
  activeTabId: string | null;
  connectionStatus?: Map<string, 'disconnected' | 'connecting' | 'connected'>;
  connectionErrors?: Map<string, string>;
  onSendData?: (tabId: string, data: string) => void;
  onResize?: (tabId: string, cols: number, rows: number) => void;
  onOutput?: (tabId: string, callback: (data: string) => void) => () => void;
}

export function TerminalArea({
  tabs,
  activeTabId,
  connectionStatus,
  connectionErrors,
  onSendData,
  onResize,
  onOutput,
}: TerminalAreaProps) {
  const { currentTheme } = useTheme();
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());
  const outputUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const dataDisposablesRef = useRef<Map<string, { dispose: () => void }>>(new Map());

  // Set up output listeners for each tab
  useEffect(() => {
    if (!onOutput) return;

    tabs.forEach((_, tabId) => {
      // Only set up if not already listening
      if (!outputUnsubsRef.current.has(tabId)) {
        const unsubs = onOutput(tabId, (data: string) => {
          const terminalHandle = terminalRefs.current.get(tabId);
          if (terminalHandle?.terminal) {
            terminalHandle.terminal.write(data);
          }
        });
        outputUnsubsRef.current.set(tabId, unsubs);
      }
    });

    // Cleanup for removed tabs
    return () => {
      outputUnsubsRef.current.forEach((unsubs, tabId) => {
        if (!tabs.has(tabId)) {
          unsubs();
          outputUnsubsRef.current.delete(tabId);
          // Also clean up onData disposable
          const disposable = dataDisposablesRef.current.get(tabId);
          if (disposable) {
            disposable.dispose();
            dataDisposablesRef.current.delete(tabId);
          }
        }
      });
    };
  }, [tabs, onOutput]);

  const connectionStatusRef = useRef(connectionStatus);
  connectionStatusRef.current = connectionStatus;
  const onSendDataRef = useRef(onSendData);
  onSendDataRef.current = onSendData;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Set up onData handlers when connection status changes
  useEffect(() => {
    if (!onSendData) return;

    tabs.forEach((_, tabId) => {
      const status = connectionStatus?.get(tabId);
      const terminalHandle = terminalRefs.current.get(tabId);
      const terminal = terminalHandle?.terminal;
      if (!terminal) return;

      console.log('[TerminalArea] Status changed for tab:', tabId, 'status:', status);

      // Clear old onData disposable
      const existing = dataDisposablesRef.current.get(tabId);
      if (existing) {
        existing.dispose();
        dataDisposablesRef.current.delete(tabId);
      }

      if (status === 'connected') {
        // SSH mode: forward input to backend
        console.log('[TerminalArea] Setting up SSH onData for tab:', tabId);
        const disposable = terminal.onData((data) => {
          onSendData(tabId, data);
        });
        dataDisposablesRef.current.set(tabId, disposable);

        // Show connected message
        terminal.write(`\x1b[1;32m${t('terminal.connected')}\x1b[0m\r\n`);
      } else if (status === 'disconnected') {
        // Local echo mode for disconnected tabs
        console.log('[TerminalArea] Setting up local echo for tab:', tabId);
        const disposable = terminal.onData((data) => {
          terminal.write(data);
        });
        dataDisposablesRef.current.set(tabId, disposable);
      }
      // 'connecting' state - don't set up onData yet
    });

    return () => {
      // Cleanup all onData handlers on unmount or when dependencies change
      dataDisposablesRef.current.forEach((disposable) => {
        disposable.dispose();
      });
    };
  }, [connectionStatus, tabs, onSendData]);

  const handleTerminalReady = useCallback((tabId: string) => {
    return (terminal: import('@xterm/xterm').Terminal) => {
      // Only display welcome message, onData management is handled by useEffect above
      const status = connectionStatusRef.current?.get(tabId);
      if (status !== 'connected') {
        terminal.write(`\x1b[1;34mNovaTerm\x1b[0m - ${t('terminal.ready')}\r\n`);
        terminal.write(`Tab: ${tabsRef.current.get(tabId)?.title || tabId}\r\n`);
        terminal.write(`\r\n\x1b[90m${t('terminal.clickToConnect')}\x1b[0m\r\n`);
      }
    };
  }, []);

  const handleResize = useCallback((tabId: string, cols: number, rows: number) => {
    onResize?.(tabId, cols, rows);
  }, [onResize]);

  const xtermTheme = toXtermTheme(currentTheme);

  return (
    <div className={styles.terminalArea}>
      {Array.from(tabs.values()).map((tab) => {
        const status = connectionStatus?.get(tab.id);
        const isConnecting = status === 'connecting';
        const error = connectionErrors?.get(tab.id);

        return (
          <div
            key={tab.id}
            className={`${styles.terminalWrapper} ${tab.id === activeTabId ? styles.visible : styles.hidden}`}
          >
            {isConnecting && (
              <div className={styles.overlay}>
                <span>{t('common.connecting')}</span>
              </div>
            )}
            {error && (
              <div className={styles.errorOverlay}>
                <span className={styles.errorText}>{t('common.errorPrefix')} {error}</span>
              </div>
            )}
            <Terminal
              ref={(handle) => {
                if (handle) {
                  terminalRefs.current.set(tab.id, handle);
                } else {
                  terminalRefs.current.delete(tab.id);
                }
              }}
              theme={xtermTheme}
              onReady={handleTerminalReady(tab.id)}
              onResize={(cols, rows) => handleResize(tab.id, cols, rows)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default TerminalArea;
