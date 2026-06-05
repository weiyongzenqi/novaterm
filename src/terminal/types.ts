import type { ITheme, Terminal as XtermTerminal } from '@xterm/xterm';

export interface TerminalProps {
  onReady?: (terminal: XtermTerminal) => void;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  theme?: ITheme;
  className?: string;
}

export interface SearchFunctions {
  findNext: (term: string) => boolean;
  findPrevious: (term: string) => boolean;
  clear: () => void;
}

export interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  terminal: XtermTerminal | null;
  fit: () => void;
  search: SearchFunctions;
}

// Re-export Terminal type from xterm
export type { Terminal } from '@xterm/xterm';

export interface TerminalHandle {
  terminal: XtermTerminal | null;
  fit: () => void;
  search: SearchFunctions;
  write: (data: string) => void;
  clear: () => void;
}
