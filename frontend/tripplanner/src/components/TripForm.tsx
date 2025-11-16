import React, { useState } from "react";
import { Paper, Typography, Box, Stack, TextField, Button } from "@mui/material";
import { useLanguage } from "../language/LanguageContext";
import { t } from "../language/i18n";

interface Props {
  onSaved: () => void;
}

export default function TripForm({ onSaved }: Props) {
  const { lang } = useLanguage();
  const [city, setCity] = useState("");
  const [days, setDays] = useState<number>(1);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:8000/save_trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days, description }),
      });

      if (response.ok) {
        setCity("");
        setDays(1);
        setDescription("");
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
        {t(lang,'addNewTrip')}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField label={t(lang,'city')} fullWidth value={city} onChange={(e) => setCity(e.target.value)} required />

          <TextField
            label={t(lang,'numberOfDays')}
            type="number"
            fullWidth
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
          />

          <TextField label={t(lang,'description')} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} required />

          <Button type="submit" variant="contained" color="primary" fullWidth>
            {t(lang,'saveTrip')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
