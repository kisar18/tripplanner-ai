import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Box, Button, CircularProgress } from '@mui/material';
import { BrowserRouter, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './language/LanguageContext';
import { t } from './language/i18n';
import './App.css';
import HomePage from './pages/HomePage';
import CreateTripPage from './pages/CreateTripPage';
import MyTripsPage from './pages/MyTripsPage';
import TripDetailPage from './pages/TripDetailPage';
const AppShell = () => {
  const { lang } = useLanguage();
  const location = useLocation();
  const [detailActions, setDetailActions] = useState<any>(null);
  const onTripDetail = /^\/trip\//.test(location.pathname);

  useEffect(() => {
    if (!onTripDetail) setDetailActions(null);
  }, [onTripDetail]);

  const navItems = [
    { label: 'TripPlanner AI', path: '/' },
    { label: t(lang,'addNewTrip'), path: '/create' },
    { label: t(lang,'plannedTrips'), path: '/trips', match: (p:string) => p.startsWith('/trips') || /^\/trip\//.test(p) }
  ];

  return (
    <>
      <AppBar position='sticky' color='default' elevation={3} sx={{ mb: 0, backdropFilter: 'blur(6px)' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
          <Box
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: '14px',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 0 0 1px rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.4)'
                : '0 0 0 1px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.08)',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))',
              '& .navBtn': {
                fontWeight: 600,
                fontSize: 15,
                px: 2.4,
                py: 1.1,
                lineHeight: 1.2,
                borderRight: `1px solid ${theme.palette.divider}`,
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                transition: 'background .25s, color .25s',
                textTransform: 'none',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(125,211,252,0.12)'
                    : 'rgba(0,0,0,0.06)'
                },
                '&:active': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(125,211,252,0.18)'
                    : 'rgba(0,0,0,0.1)'
                },
                '&:last-of-type': { borderRight: 'none' }
              },
              '& .navBtn.active': {
                fontWeight: 700,
                fontSize: 16,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(14,165,233,0.30), rgba(236,72,153,0.24))'
                  : 'linear-gradient(145deg, rgba(80,80,255,0.25), rgba(255,140,255,0.22))',
                boxShadow: theme.palette.mode === 'dark'
                  ? 'inset 0 0 0 1px rgba(125,211,252,0.35), 0 4px 10px rgba(0,0,0,0.55)'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.14)',
                color: theme.palette.mode === 'dark' ? '#fff' : '#111',
                letterSpacing: '.5px'
              },
              '@media (max-width:900px)': { '& .navBtn': { fontSize: 14, px: 2 } }
            })}
          >
            {navItems.map(item => {
              const active = item.match ? item.match(location.pathname) : location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  className={`navBtn ${active ? 'active' : ''}`}
                  component={RouterLink}
                  to={item.path}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {onTripDetail && detailActions && (
              <>
                <Button
                  onClick={detailActions.exportPdf}
                  variant='outlined'
                  color='secondary'
                  disabled={detailActions.exporting}
                  sx={{ fontWeight: 600 }}
                  startIcon={detailActions.exporting ? <CircularProgress size={18} /> : null}
                >
                  {detailActions.exporting ? 'Exporting…' : 'Export PDF'}
                </Button>
              </>
            )}
            <LanguageSwitcher />
            <ThemeToggle inline />
          </Box>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/create' element={<CreateTripPage />} />
        <Route path='/trips' element={<MyTripsPage />} />
        <Route path='/trip/:id' element={<TripDetailPage registerActions={setDetailActions} />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;