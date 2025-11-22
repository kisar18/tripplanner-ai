import React, { useState } from "react";
import { Paper, Typography, Box, TextField, Button, Fade } from "@mui/material";
import { useTheme } from '@mui/material/styles';
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
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fade in>
      <Paper
        elevation={8}
        sx={{
          p: 4,
          maxWidth: 720,
          mx: "auto",
          mb: 4,
          borderRadius: "1.5rem",
          position: 'relative',
          overflow: 'hidden',
          background: isLight ? 'linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))' : 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
          backdropFilter: 'blur(10px)',
          boxShadow: isLight ? '0 15px 40px rgba(0,0,0,0.15)' : '0 20px 50px rgba(0,0,0,0.5)',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -80,
            right: -80,
            width: 220,
            height: 220,
            background: isLight ? 'radial-gradient(circle at center, rgba(99,102,241,0.35), transparent 70%)' : 'radial-gradient(circle at center, rgba(99,102,241,0.55), transparent 70%)'
          }
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, letterSpacing: 1, color: isLight ? '#1e293b' : 'inherit' }}>
          ✨ {t(lang,'addNewTrip')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gap: 12, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box>
              <TextField
                label={t(lang,'city')}
                fullWidth
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.9rem', background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)' } }}
              />
            </Box>
            <Box>
              <TextField
                label={t(lang,'numberOfDays')}
                type="number"
                fullWidth
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.9rem', background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)' } }}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label={t(lang,'description')}
                fullWidth
                multiline
                minRows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '1rem', background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)' } }}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={submitting}
                sx={{
                  py: 1.4,
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: '1rem',
                  boxShadow: isLight ? '0 8px 20px rgba(0,0,0,0.18)' : '0 10px 25px rgba(0,0,0,0.35)',
                  background: 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                }}
              >
                {submitting ? 'Saving…' : t(lang,'saveTrip')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Fade>
  );
}
