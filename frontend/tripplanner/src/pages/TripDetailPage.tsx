import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TripDetail from '../components/TripDetail';
import { Trip } from '../types';
import { Box, CircularProgress, Button } from '@mui/material';
import { useLanguage } from '../language/LanguageContext';
import { t } from '../language/i18n';
import PageContainer from '../components/PageContainer';

interface DetailActions {
  exportPdf: () => void;
  exporting: boolean;
}

export default function TripDetailPage({ registerActions }: { registerActions?: (a: DetailActions | null) => void }) {
  const { id } = useParams();
  const tripId = Number(id);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasPatchedOnce = React.useRef(false);
  const navigate = useNavigate();
  const { lang } = useLanguage();

  useEffect(() => {
    hasPatchedOnce.current = false;
  }, [tripId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/trips');
        const data: Trip[] = await res.json();
        const found = data.find(t => t.id === tripId) || null;
        setTrip(found);
        setChecked(found?.placesToVisit ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  // Register actions with parent (App) for global menu buttons
  useEffect(() => {
    if (!registerActions || !trip) return;
    registerActions({
      exportPdf: async () => {
        if (!trip) return;
        setExporting(true);
        try {
          const res = await fetch(`http://127.0.0.1:8000/trips/${trip.id}/export/pdf`);
          if (!res.ok) throw new Error(await res.text() || res.statusText);
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          const citySafe = (trip.city || `trip-${trip.id}`).replace(/\s+/g, '_');
          a.href = url;
          a.download = `trip_${citySafe}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (e) {
          console.error('PDF export failed', e);
        } finally {
          setExporting(false);
        }
      },
      exporting
    });
    return () => { registerActions(null); };
  }, [registerActions, trip, exporting]);

  // Auto-save places when selection changes (after initial load)
  useEffect(() => {
    if (!trip) return;
    if (!hasPatchedOnce.current) {
      hasPatchedOnce.current = true;
      return;
    }
    const persist = async () => {
      setSaving(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/trips/${trip.id}/places`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ places: checked })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || res.statusText);
        }
      } catch (e) {
        console.error('Auto-save places failed', e);
      } finally {
        setSaving(false);
      }
    };
    persist();
  }, [checked, trip?.id]);

  if (loading) return <PageContainer><Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box></PageContainer>;
  if (!trip) return <PageContainer><Box sx={{ textAlign: 'center', mt: 8 }}><Button variant='outlined' onClick={() => navigate('/trips')}>{t(lang,'backToList')}</Button><Box sx={{ mt:2 }}>{t(lang,'plannedTrips')} not found.</Box></Box></PageContainer>;

  return <PageContainer><TripDetail trip={trip} checked={checked} setChecked={setChecked} saving={saving} /></PageContainer>;
}
