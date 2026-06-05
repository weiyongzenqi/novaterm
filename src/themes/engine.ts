import type { ITheme } from '@xterm/xterm';
import type { TerminalTheme } from './types';

// Import all built-in themes
import dracula from '../../themes/dracula.json';
import gruvboxDark from '../../themes/gruvbox-dark.json';
import nord from '../../themes/nord.json';
import tokyoNight from '../../themes/tokyo-night.json';
import catppuccinMocha from '../../themes/catppuccin-mocha.json';
import oneDark from '../../themes/one-dark.json';

export const builtInThemes: TerminalTheme[] = [
  dracula as TerminalTheme,
  gruvboxDark as TerminalTheme,
  nord as TerminalTheme,
  tokyoNight as TerminalTheme,
  catppuccinMocha as TerminalTheme,
  oneDark as TerminalTheme,
];

/**
 * Convert TerminalTheme to xterm.js ITheme
 */
export function toXtermTheme(theme: TerminalTheme): ITheme {
  return {
    black: theme.colors.black,
    red: theme.colors.red,
    green: theme.colors.green,
    yellow: theme.colors.yellow,
    blue: theme.colors.blue,
    magenta: theme.colors.magenta,
    cyan: theme.colors.cyan,
    white: theme.colors.white,
    brightBlack: theme.colors.brightBlack,
    brightRed: theme.colors.brightRed,
    brightGreen: theme.colors.brightGreen,
    brightYellow: theme.colors.brightYellow,
    brightBlue: theme.colors.brightBlue,
    brightMagenta: theme.colors.brightMagenta,
    brightCyan: theme.colors.brightCyan,
    brightWhite: theme.colors.brightWhite,
    foreground: theme.colors.foreground,
    background: theme.colors.background,
    cursor: theme.colors.cursor,
    cursorAccent: theme.colors.cursorAccent,
    selectionBackground: theme.colors.selectionBackground,
    selectionForeground: theme.colors.selectionForeground,
  };
}

/**
 * Convert TerminalTheme to CSS variables object
 */
export function toCSSVariables(theme: TerminalTheme): Record<string, string> {
  return {
    '--sidebar-bg': theme.ui.sidebarBg,
    '--sidebar-text': theme.ui.sidebarText,
    '--tab-bg': theme.ui.tabBg,
    '--tab-active-bg': theme.ui.tabActiveBg,
    '--tab-inactive-bg': theme.ui.tabInactiveBg,
    '--tab-text': theme.ui.tabText,
    '--tab-active-text': theme.ui.tabActiveText,
    '--status-bar-bg': theme.ui.statusBarBg,
    '--status-bar-text': theme.ui.statusBarText,
    '--border-color': theme.ui.borderColor,
    '--accent-color': theme.ui.accentColor,
    '--button-bg': theme.ui.buttonBg,
    '--button-hover-bg': theme.ui.buttonHoverBg,
    '--input-bg': theme.ui.inputBg,
    '--input-text': theme.ui.inputText,
    '--terminal-bg': theme.colors.background,
    '--terminal-fg': theme.colors.foreground,
  };
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: TerminalTheme): void {
  const root = document.documentElement;
  const cssVars = toCSSVariables(theme);

  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Get theme by name
 */
export function getThemeByName(name: string): TerminalTheme | undefined {
  return builtInThemes.find((t) => t.name === name);
}

/**
 * Get all available theme names
 */
export function getAvailableThemeNames(): string[] {
  return builtInThemes.map((t) => t.name);
}
