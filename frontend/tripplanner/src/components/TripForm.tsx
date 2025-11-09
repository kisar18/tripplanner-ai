import React, { useState } from "react";
import { Paper, Typography, Box, Stack, TextField, Button } from "@mui/material";

interface Props {
  onSaved: () => void;
}

export default function TripForm({ onSaved }: Props) {
  const [city, setCity] = useState("");
  const [days, setDays] = useState<number>(1);
  const [itinerary, setItinerary] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:8000/save_trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days, itinerary }),
      });

      if (response.ok) {
        setCity("");
        setDays(1);
        setItinerary("");
        onSaved();
      } else {
        console.error("Error while saving the new trip:", await response.text());
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{ p: 4, maxWidth: 600, mx: "auto", mb: 4, borderRadius: "1rem" }}
    >
      <Typography variant="h6" gutterBottom>
        Add a New Trip
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField label="City" fullWidth value={city} onChange={(e) => setCity(e.target.value)} required />

          <TextField
            label="Number of Days"
            type="number"
            fullWidth
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
          />

          <TextField label="Itinerary" fullWidth value={itinerary} onChange={(e) => setItinerary(e.target.value)} required />

          <Button type="submit" variant="contained" color="primary" fullWidth>
            Save Trip
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
