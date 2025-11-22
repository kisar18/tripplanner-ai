import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert, Typography, Fade } from '@mui/material';
import PageContainer from '../components/PageContainer';
import TripTable from '../components/TripTable';
import { Trip } from '../types';
import { useLanguage } from '../language/LanguageContext';
import { t } from '../language/i18n';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MyTripsPage() {
  const { lang } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deleteSnackbarOpen, setDeleteSnackbarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchTrips = () => {
    fetch('http://127.0.0.1:8000/trips')
      .then(res => res.json())
      .then(data => setTrips(data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchTrips(); }, []);

  const openDeleteConfirm = (id: number) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (pendingDeleteId == null) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/trips/${pendingDeleteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTrips();
        setDeleteSnackbarOpen(true);
      } else {
        console.error('Delete failed:', await res.text());
      }
    } catch (err) {
      console.error('Network error (delete):', err);
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <Fade in>
      <PageContainer>
        <Box sx={{ position: 'relative' }}>
          <Typography variant='h3' align='center' sx={{ mb: 5, fontWeight: 800, letterSpacing: 1 }}>
            {t(lang,'plannedTrips')}
          </Typography>
          <TripTable
            trips={trips}
            onSelect={(t) => navigate(`/trip/${t.id}`)}
            onRequestDelete={openDeleteConfirm}
          />
        </Box>
        <ConfirmDialog
          open={confirmOpen}
          title={t(lang,'confirmDeleteTitle')}
          content={t(lang,'confirmDeleteContent')}
          onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
          onConfirm={handleDeleteConfirmed}
        />
        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
          <Alert severity='success' variant='filled'>{t(lang,'tripSaved')}</Alert>
        </Snackbar>
        <Snackbar open={deleteSnackbarOpen} autoHideDuration={3000} onClose={() => setDeleteSnackbarOpen(false)}>
          <Alert severity='success' variant='filled'>{t(lang,'tripDeleted')}</Alert>
        </Snackbar>
      </PageContainer>
    </Fade>
  );
}
