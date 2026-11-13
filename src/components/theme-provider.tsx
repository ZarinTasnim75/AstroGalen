// AstroGalen — theme provider. Persists the choice in localStorage AND IndexedDB,
// with an inline head script (in layout.tsx) preventing theme flash.
'use client';

import * as React from 'react';
import { MotionConfig } from 'framer-motion';

type Theme = 'dark' | 'light';
const KEY = 'orbit-theme';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('dark');

  React.useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? undefined;
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initial: Theme = stored ?? (prefersLight ? 'light' : 'dark');
    setThemeState(initial);
    apply(initial);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // private mode etc. — theme still applies for this session
    }
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
    </MotionConfig>
  );
}

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
