import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { TerminalTheme, ThemeContextValue } from './types';
import { builtInThemes, applyTheme, getThemeByName, toXtermTheme } from './engine';

const THEME_STORAGE_KEY = 'novaterm-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = 'dracula',
}: {
  children: ReactNode;
  defaultTheme?: string;
}) {
  const [themeName, setThemeName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THEME_STORAGE_KEY) || defaultTheme;
    }
    return defaultTheme;
  });
  const [currentTheme, setCurrentTheme] = useState<TerminalTheme>(() => {
    return getThemeByName(themeName) || builtInThemes[0];
  });
  const [isLoading, setIsLoading] = useState(false);

  const setTheme = useCallback(async (name: string) => {
    const theme = getThemeByName(name);
    if (!theme) {
      console.warn(`Theme "${name}" not found`);
      return;
    }
    setIsLoading(true);
    try {
      applyTheme(theme);
      setThemeName(name);
      setCurrentTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, name);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply initial theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  const value: ThemeContextValue = {
    currentTheme,
    themeName,
    setTheme,
    availableThemes: builtInThemes,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { toXtermTheme };
