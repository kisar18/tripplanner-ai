import React, { useEffect, useState } from "react";
import { Box, Typography, Snackbar, Alert, AppBar, Toolbar } from "@mui/material";
import ThemeToggle from "./components/ThemeToggle";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useLanguage } from "./language/LanguageContext";
import { t } from "./language/i18n";
import "./App.css";
import { Trip } from "./types";
import TripForm from "./components/TripForm";
import TripTable from "./components/TripTable";
import TripDetail from "./components/TripDetail";
import ConfirmDialog from "./components/ConfirmDialog";

function App() {
  const { lang } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deleteSnackbarOpen, setDeleteSnackbarOpen] = useState(false);

  const fetchTrips = () => {
    fetch("http://127.0.0.1:8000/trips")
      .then((res) => res.json())
      .then((data) => setTrips(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const onSaved = () => {
    fetchTrips();
    setSnackbarOpen(true);
  };

  const openDeleteConfirm = (id: number) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (pendingDeleteId == null) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/trips/${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTrips();
        if (selectedTrip?.id === pendingDeleteId) setSelectedTrip(null);
        setDeleteSnackbarOpen(true);
      } else {
        console.error("Delete failed:", await res.text());
      }
    } catch (err) {
      console.error("Network error (delete):", err);
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const formatDescription = (desc: string) => desc;

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  return (
    <>
      <AppBar position="sticky" color="default" elevation={2} sx={{ mb: 3, borderRadius: '0 0 1rem 1rem', boxShadow: 3 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
          <Box sx={{ fontWeight: 600, fontSize: 18, ml: 1 }}>{t(lang,'plannedTrips')}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSwitcher />
            <ThemeToggle inline />
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          🧳 {t(lang,'plannedTrips')}
        </Typography>

  <TripForm onSaved={onSaved} />

  <TripTable trips={trips} onSelect={(t) => setSelectedTrip(t)} onRequestDelete={openDeleteConfirm} formatDescription={formatDescription} />

        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
          <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
            {t(lang,'tripSaved')}
          </Alert>
        </Snackbar>

        <ConfirmDialog
          open={confirmOpen}
          title={t(lang,'confirmDeleteTitle')}
          content={t(lang,'confirmDeleteContent')}
          onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
          onConfirm={handleDeleteConfirmed}
        />

        <Snackbar open={deleteSnackbarOpen} autoHideDuration={3000} onClose={() => setDeleteSnackbarOpen(false)}>
          <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
            {t(lang,'tripDeleted')}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}

export default App;