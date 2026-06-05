import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { useTerminal } from './useTerminal';
import type { TerminalProps, SearchFunctions } from './types';
import type { Terminal as TerminalInstance } from '@xterm/xterm';
import styles from './Terminal.module.css';

export interface TerminalHandle {
  terminal: TerminalInstance | null;
  fit: () => void;
  search: SearchFunctions;
  write: (data: string) => void;
  clear: () => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal(props, ref) {
    const { onReady, onData, onResize, theme, className } = props;

    const { terminalRef, terminal, fit, search } = useTerminal({
      theme,
      onData,
      onResize,
    });

    useImperativeHandle(ref, () => ({
      terminal,
      fit,
      search,
      write: (data: string) => terminal?.write(data),
      clear: () => terminal?.clear(),
    }), [terminal, fit, search]);

    // Call onReady when terminal is ready (with guard to prevent duplicate calls)
    const onReadyCalledRef = useRef(false);
    useEffect(() => {
      if (terminal && onReady && !onReadyCalledRef.current) {
        onReadyCalledRef.current = true;
        onReady(terminal);
      }
    }, [terminal, onReady]);

    return (
      <div
        ref={terminalRef}
        className={`${styles.container} ${className || ''}`}
      />
    );
  }
);

export default Terminal;
