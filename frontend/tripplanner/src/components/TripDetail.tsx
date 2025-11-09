import React, { useEffect, useState } from "react";
import { Box, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Link } from "@mui/material";
import { Trip } from "../types";

interface POI {
  xid?: string;
  name?: string;
  dist?: number;
  kinds?: string;
  point?: { lon?: number; lat?: number } | null;
}

interface Props {
  trip: Trip;
  onBack: () => void;
}

export default function TripDetail({ trip, onBack }: Props) {
  const raw = trip.itinerary; // string
  let pretty = "";
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    pretty = raw;
  }

  const [places, setPlaces] = useState<POI[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://127.0.0.1:8000/places/${encodeURIComponent(trip.city)}`);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || res.statusText);
        }
        const data = await res.json();
        // data.places if normalized by backend, otherwise try to use data.features
        let list: POI[] = [];
        if (data && Array.isArray(data.places)) list = data.places;
        else if (data && Array.isArray(data.features)) {
          list = data.features.map((f: any) => ({
            xid: f.properties?.xid,
            name: f.properties?.name,
            dist: f.properties?.dist,
            kinds: f.properties?.kinds,
            point: f.geometry?.coordinates ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : null,
          }));
        } else if (Array.isArray(data)) list = data;

        if (mounted) setPlaces(list);
      } catch (err: any) {
        if (mounted) setError(String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [trip.city]);

  return (
    <Box sx={{ p: 4 }}>
      <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>
        ← Back to list
      </Button>

      <Paper elevation={4} sx={{ p: 4, maxWidth: 800, mx: "auto", borderRadius: "1rem" }}>
        <Typography variant="h5" gutterBottom>
          Trip detail — {trip.city}
        </Typography>

        <Typography><strong>Days:</strong> {trip.days}</Typography>
        <Typography sx={{ mt: 2 }}><strong>Itinerary</strong></Typography>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {pretty}
        </Paper>

        <Typography variant="h6" sx={{ mt: 3 }}>Interesting places nearby</Typography>
        {loading && <CircularProgress size={24} sx={{ mt: 1 }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {places && places.length === 0 && <Typography sx={{ mt: 1 }}>No places found.</Typography>}
        {places && places.length > 0 && (
          <List>
            {places.map((p, i) => (
              <ListItem key={p.xid ?? i}>
                <ListItemText
                  primary={p.name ?? "Unnamed"}
                  secondary={<>
                    {p.kinds && <span>{p.kinds} — </span>}
                    {typeof p.dist === 'number' && <span>{Math.round(p.dist)} m</span>}
                    {p.xid && (
                      <> — <Link href={`https://opentripmap.io/en/places/${p.xid}`} target="_blank" rel="noopener">Details</Link></>
                    )}
                  </>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
