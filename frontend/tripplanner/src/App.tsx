import React, { useEffect, useState } from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import "./App.css";
import { Trip } from "./types";
import TripForm from "./components/TripForm";
import TripTable from "./components/TripTable";
import TripDetail from "./components/TripDetail";
import ConfirmDialog from "./components/ConfirmDialog";

function App() {
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
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        🧳 Planned Trips
      </Typography>

      <TripForm onSaved={onSaved} />

      <TripTable trips={trips} onSelect={(t) => setSelectedTrip(t)} onRequestDelete={openDeleteConfirm} formatDescription={formatDescription} />

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Trip Saved!
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm delete"
        content="Are you sure you want to delete this trip? This action cannot be undone."
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        onConfirm={handleDeleteConfirmed}
      />

      <Snackbar open={deleteSnackbarOpen} autoHideDuration={3000} onClose={() => setDeleteSnackbarOpen(false)}>
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Trip deleted
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;