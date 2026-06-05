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

  const handleTerminalReady = useCallback((tabId: string) => {
    return (terminal: import('@xterm/xterm').Terminal) => {
      const status = connectionStatusRef.current?.get(tabId);

      if (status === 'connected') {
        // SSH session exists - set up data handling
        terminal.onData((data) => {
          onSendDataRef.current?.(tabId, data);
        });

        terminal.write(`\x1b[1;32m${t('terminal.connected')}\x1b[0m\r\n`);
      } else {
        // No SSH session - local echo mode
        terminal.write(`\x1b[1;34mNovaTerm\x1b[0m - ${t('terminal.ready')}\r\n`);
        terminal.write(`Tab: ${tabsRef.current.get(tabId)?.title || tabId}\r\n`);
        terminal.write(`\r\n\x1b[90m${t('terminal.clickToConnect')}\x1b[0m\r\n`);

        // Local echo for demo
        terminal.onData((data) => {
          terminal.write(data);
        });
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
