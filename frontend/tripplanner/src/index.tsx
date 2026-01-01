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
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#7dd3fc' : '#2563eb'
      },
      secondary: {
        main: mode === 'dark' ? '#f472b6' : '#f43f5e'
      },
      background: mode === 'dark'
        ? { default: '#050910', paper: 'rgba(12,18,32,0.9)' }
        : { default: '#f8fafc', paper: '#ffffff' },
      text: mode === 'dark'
        ? { primary: '#e5edf7', secondary: '#9fb3c8' }
        : { primary: '#0f172a', secondary: '#475569' },
      divider: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    },
    typography: {
      fontFamily: '"Space Grotesk", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      button: { fontWeight: 700 }
    },
    shape: { borderRadius: 14 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 700
          }
        }
      }
    }
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