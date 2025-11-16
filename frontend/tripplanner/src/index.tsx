import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './language/LanguageContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeToggle from './components/ThemeToggle';
import { ColorModeContext, ColorMode } from './theme/ColorModeContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
function ThemedRoot() {
  const [mode, setMode] = useState<ColorMode>('light');

  // Initialize from localStorage or system preference
  useEffect(() => {
    const saved = (localStorage.getItem('color-mode') as ColorMode | null);
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('color-mode', next);
      return next;
    })
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: { mode }
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <LanguageProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </ColorModeContext.Provider>
  );
}

root.render(
  <React.StrictMode>
    <ThemedRoot />
  </React.StrictMode>
);