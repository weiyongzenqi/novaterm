import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import type { ITheme } from '@xterm/xterm';
import type { UseTerminalReturn, SearchFunctions } from './types';

import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  theme?: ITheme;
  fontSize?: number;
  fontFamily?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const { theme, fontSize = 14, fontFamily = '"Fira Code", "JetBrains Mono", monospace', onData, onResize } = options;

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  const [terminal, setTerminal] = useState<Terminal | null>(null);

  // Store latest callbacks in refs so they don't stale in the mount-only useEffect
  const onDataRef = useRef(onData);
  useEffect(() => { onDataRef.current = onData; }, [onData]);

  const onResizeRef = useRef(onResize);
  useEffect(() => { onResizeRef.current = onResize; }, [onResize]);

  // Fit terminal to container
  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalInstanceRef.current) {
      fitAddonRef.current.fit();
    }
  }, []);

  // Search functions
  const search: SearchFunctions = {
    findNext: useCallback((term: string) => {
      if (searchAddonRef.current) {
        return searchAddonRef.current.findNext(term);
      }
      return false;
    }, []),
    findPrevious: useCallback((term: string) => {
      if (searchAddonRef.current) {
        return searchAddonRef.current.findPrevious(term);
      }
      return false;
    }, []),
    clear: useCallback(() => {
      if (searchAddonRef.current) {
        searchAddonRef.current.clearDecorations();
      }
    }, []),
  };

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      fontFamily,
      fontSize,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: theme,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(terminalRef.current);

    // Try to enable WebGL renderer with safe error handling
    let webglAddon: WebglAddon | undefined;
    try {
      webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load:', e);
      webglAddon = undefined;
    }

    // Initial fit
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && onResizeRef.current) {
          onResizeRef.current(dims.cols, dims.rows);
        }
      });
    });

    resizeObserver.observe(terminalRef.current);

    // Handle data input - use ref so the latest callback is always invoked
    const dataDisposable = terminal.onData((data) => {
      onDataRef.current?.(data);
    });

    // Store refs
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    setTerminal(terminal);

    return () => {
      resizeObserver.disconnect();
      dataDisposable?.dispose();
      webglAddon?.dispose();
      searchAddon.dispose();
      fitAddon.dispose();
      terminal.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      setTerminal(null);
    };
  }, []); // Only run once on mount

  // Update theme when it changes
  useEffect(() => {
    if (terminalInstanceRef.current && theme) {
      terminalInstanceRef.current.options.theme = theme;
    }
  }, [theme]);

  return {
    terminalRef,
    terminal,
    fit,
    search,
  };
}
