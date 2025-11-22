import React, { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import PageContainer from '../components/PageContainer';
import TripForm from '../components/TripForm';
import { useLanguage } from '../language/LanguageContext';
import { t } from '../language/i18n';
import { Link as RouterLink } from 'react-router-dom';

export default function CreateTripPage() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <PageContainer padTop={4}>
      <TripForm onSaved={() => setOpen(true)} />
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert severity="success" variant="filled">{t(lang,'tripSaved')}</Alert>
      </Snackbar>
    </PageContainer>
  );
}
