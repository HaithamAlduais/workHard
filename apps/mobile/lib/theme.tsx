import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(scheme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    if (scheme === 'light' || scheme === 'dark') setTheme(scheme);
  }, [scheme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const colors = {
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHighlight: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    primary: '#38bdf8',
    primaryMuted: '#0284c7',
    success: '#4ade80',
    warning: '#facc15',
    danger: '#f87171',
    border: '#334155'
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceHighlight: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    primary: '#0284c7',
    primaryMuted: '#0369a1',
    success: '#16a34a',
    warning: '#ca8a04',
    danger: '#dc2626',
    border: '#cbd5e1'
  }
};

export function useColors() {
  const { theme } = useTheme();
  return colors[theme];
}
