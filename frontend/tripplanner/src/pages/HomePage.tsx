import React from 'react';
import { Box, Button, Typography, Stack, Container, Card, CardContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PageContainer from '../components/PageContainer';
import { useLanguage } from '../language/LanguageContext';
import { t } from '../language/i18n';
import { Link as RouterLink } from 'react-router-dom';

export default function HomePage() {
  const { lang } = useLanguage();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const cardBg = isLight ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.85)';
  const cardShadow = isLight ? '0 12px 30px rgba(0,0,0,0.15)' : '0 10px 30px rgba(0,0,0,0.7)';
  const textShadow = isLight ? '0 2px 8px rgba(0,0,0,0.3)' : '0 3px 12px rgba(0,0,0,0.8)';
  return (
    <PageContainer image>
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Stack spacing={6}>
          <Box
            textAlign="center"
            sx={{
              bgcolor: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.80)',
              backdropFilter: 'blur(12px)',
              py: 4,
              px: 3,
              borderRadius: '1.5rem',
              boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 28px rgba(0,0,0,0.8)'
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                letterSpacing: 2,
                mb: 2,
                textShadow,
                color: isLight ? '#1a1a1a' : '#fff'
              }}
            >
              TripPlanner AI
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 400,
                textShadow,
                color: isLight ? '#2d3748' : 'rgba(255,255,255,0.95)'
              }}
            >
              {t(lang,'plannedTrips')} · Luxury travel planning made effortless
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
            <Button component={RouterLink} to="/create" size="large" variant="contained" color="primary" sx={{ px: 4, py: 1.5, fontSize: 18, fontWeight: 600 }}>
              {t(lang,'addNewTrip')}
            </Button>
            <Button
              component={RouterLink}
              to="/trips"
              size="large"
              variant={isLight ? 'contained' : 'contained'}
              color={isLight ? 'secondary' : 'secondary'}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: 18,
                fontWeight: 600,
                ...(isLight ? {} : {
                  bgcolor: '#fff',
                  color: '#1a1a1a',
                  border: '2px solid #fff',
                  '&:hover': {
                    bgcolor: '#f0f0f0',
                    borderColor: '#f0f0f0'
                  }
                })
              }}
            >
              {t(lang,'plannedTrips')}
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Card sx={{ flex: 1, bgcolor: cardBg, backdropFilter: 'blur(10px)', borderRadius: '1.2rem', boxShadow: cardShadow }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: isLight ? '#1a1a1a' : '#fff', fontWeight: 600 }}>Smart Discovery</Typography>
                <Typography variant="body1" sx={{ color: isLight ? '#4a5568' : 'rgba(255,255,255,0.85)' }}>Find curated points of interest with image & wiki enrichment.</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, bgcolor: cardBg, backdropFilter: 'blur(10px)', borderRadius: '1.2rem', boxShadow: cardShadow }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: isLight ? '#1a1a1a' : '#fff', fontWeight: 600 }}>PDF Itinerary</Typography>
                <Typography variant="body1" sx={{ color: isLight ? '#4a5568' : 'rgba(255,255,255,0.85)' }}>Export elegant PDFs with images for offline use & sharing.</Typography>
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      </Container>
    </PageContainer>
  );
}
