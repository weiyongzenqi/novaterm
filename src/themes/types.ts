export interface TerminalTheme {
  name: string;
  displayName: string;
  author?: string;
  colors: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
    foreground: string;
    background: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    selectionForeground?: string;
  };
  ui: {
    sidebarBg: string;
    sidebarText: string;
    tabBg: string;
    tabActiveBg: string;
    tabInactiveBg: string;
    tabText: string;
    tabActiveText: string;
    statusBarBg: string;
    statusBarText: string;
    borderColor: string;
    accentColor: string;
    buttonBg: string;
    buttonHoverBg: string;
    inputBg: string;
    inputText: string;
  };
}

export interface ThemeContextValue {
  currentTheme: TerminalTheme;
  themeName: string;
  setTheme: (name: string) => Promise<void>;
  availableThemes: TerminalTheme[];
  isLoading: boolean;
}
