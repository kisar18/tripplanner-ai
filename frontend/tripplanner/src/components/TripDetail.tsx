import React, { useEffect, useState, useMemo } from "react";
import { Box, Button, Paper, Typography, CircularProgress, Alert, Link, ToggleButton, ToggleButtonGroup, TextField, Card, CardMedia, CardContent, Chip, Checkbox, FormControlLabel, AppBar, Toolbar } from "@mui/material";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../language/LanguageContext";
import { t } from "../language/i18n";
import { Trip } from "../types";

interface POI {
  xid?: string;
  name?: string;
  name_en?: string;
  name_translated?: string;
  dist?: number;
  kinds?: string;
  point?: { lon?: number; lat?: number } | null;
  popularity?: number;
  has_wikipedia?: boolean;
  has_website?: boolean;
  has_hours?: boolean;
  image_url?: string;
  wikipedia?: string;
}

interface Props {
  trip: Trip;
  onBack: () => void;
}

export default function TripDetail({ trip, onBack }: Props) {
  const { lang } = useLanguage();
  const [places, setPlaces] = useState<POI[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [checked, setChecked] = useState<string[]>(trip.placesToVisit ?? []);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(trip.description), null, 2);
    } catch {
      return trip.description;
    }
  }, [trip.description]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
  const url = `http://127.0.0.1:8000/places/${encodeURIComponent(trip.city)}?category=${category}&limit=10&with_images=true&lang=${lang}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text() || res.statusText);
        
        const data = await res.json();
        if (mounted) setPlaces(data?.places || []);
      } catch (err: any) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [trip.city, category, lang]);

  const filteredPlaces = useMemo(() => 
    places?.filter(p => {
      const nm = ((p as any).name_translated || p.name_en || p.name || '').toLowerCase();
      return nm.includes(searchQuery.toLowerCase()) || p.kinds?.toLowerCase().includes(searchQuery.toLowerCase());
    }) ?? null,
    [places, searchQuery]
  );

  const handleCheck = (xid: string | undefined, checkedVal: boolean) => {
    if (!xid) return;
    setChecked(prev => checkedVal ? [...prev, xid] : prev.filter(x => x !== xid));
  };

  const handleSavePlaces = async () => {
    try {
      // Persist to backend
      await fetch(`http://127.0.0.1:8000/trips/${trip.id}/places`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: checked })
      });
      // Update local state for immediate UX
      trip.placesToVisit = checked;
      setSaveMsg("Places to visit saved!");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const handleExportPDF = async () => {
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
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Sticky top menu with Save button and Back */}
      <AppBar position="sticky" color="default" elevation={2} sx={{ mb: 3, borderRadius: '0 0 1rem 1rem', boxShadow: 3 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
          <Button variant="outlined" onClick={onBack} sx={{ fontWeight: 600, fontSize: 16 }}>
            ← {t(lang, 'backToList')}
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSwitcher />
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleExportPDF}
              sx={{ minWidth: 140, fontWeight: 600 }}
            >
              Export PDF
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ minWidth: 180, fontWeight: 600, fontSize: 18, boxShadow: 3 }}
              onClick={handleSavePlaces}
              disabled={checked.length === 0}
            >
              {t(lang, 'savePlacesToVisit')}
            </Button>
            <ThemeToggle inline />
          </Box>
        </Toolbar>
      </AppBar>

      <Paper elevation={6} sx={{ p: { xs: 2, sm: 4 }, maxWidth: 900, mx: "auto", borderRadius: "1.5rem", bgcolor: 'background.paper', boxShadow: 6 }}>
        <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid', borderColor: 'divider' }}>
          <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 1, letterSpacing: 1 }}>
            {trip.city}
          </Typography>
          <Typography variant="h5" align="center" sx={{ color: 'primary.main', fontWeight: 500, mb: 1 }}>
            {t(lang, 'tripDetails')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 1 }}>
            <Chip label={`${t(lang, 'days')}: ${trip.days}`} color="primary" size="medium" sx={{ fontSize: 16, px: 2 }} />
          </Box>
          <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600, color: 'text.secondary' }}>{t(lang, 'description')}</Typography>
          <Box sx={{ p: 2, mt: 1, mb: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', borderRadius: '0.75rem', fontSize: 17, fontFamily: 'inherit', color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary', lineHeight: 1.7 }}>
            {trip.description}
          </Box>
          {/* List of selected places to visit */}
          {trip.placesToVisit && trip.placesToVisit.length > 0 && places && (
            <Box sx={{ mt: 2, mb: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', borderRadius: '0.75rem', p: 2, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main', mb: 1 }}>{t(lang, 'placesToVisit')}</Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0, fontSize: 16 }}>
                {trip.placesToVisit.map(xid => {
                  const found = places.find(p => p.xid === xid);
                  return (
                    <li key={xid} style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: '#4caf50' }}>{found?.name || xid}</span>
                    </li>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
        <Typography variant="h5" sx={{ mt: 2, mb: 2, fontWeight: 600, color: 'primary.dark', letterSpacing: 1 }}>{t(lang, 'interestingPlacesNearby')}</Typography>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <ToggleButtonGroup
            value={category}
            exclusive
            onChange={(e, newCategory) => newCategory && setCategory(newCategory)}
            size="small"
          >
            <ToggleButton value="all">{t(lang, 'all')}</ToggleButton>
            <ToggleButton value="museums">{t(lang, 'museums')}</ToggleButton>
            <ToggleButton value="parks">{t(lang, 'parks')}</ToggleButton>
            <ToggleButton value="restaurants">{t(lang, 'restaurants')}</ToggleButton>
            <ToggleButton value="attractions">{t(lang, 'attractions')}</ToggleButton>
            <ToggleButton value="historic">{t(lang, 'historic')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder={t(lang, 'searchPlaces')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        {loading && <CircularProgress size={24} sx={{ mt: 1 }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {!loading && places && places.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t(lang, 'noPlacesFound')} {" "}
            <Link href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(trip.city)}`} target="_blank" rel="noopener">
              OpenStreetMap
            </Link>
            {" "}{t(lang, 'or')}{" "}
            <Link href={`https://www.google.com/maps/search/${encodeURIComponent(trip.city)}`} target="_blank" rel="noopener">
              Google Maps
            </Link>
            .
          </Alert>
        )}
        {!loading && filteredPlaces && filteredPlaces.length === 0 && places && places.length > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t(lang, 'noPlacesMatch')} "{searchQuery}".
          </Alert>
        )}
        {filteredPlaces && filteredPlaces.length > 0 && (
          <>
            <Typography variant="body2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
              {filteredPlaces.length} {filteredPlaces.length !== places?.length && `${t(lang, 'of')} ${places?.length}`} {t(lang, 'places')}
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr'
              },
              gap: 3,
              mb: 2
            }}>
              {filteredPlaces.map((p, i) => {
                const img = p.image_url || '/placeholder.svg';
                const xid = p.xid ?? String(i);
                return (
                  <Box key={xid}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '1rem',
                        boxShadow: 3,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 8, borderColor: 'primary.light' },
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                        borderWidth: 2
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={img}
                        alt={p.name || 'place'}
                        sx={{ height: 170, objectFit: 'cover', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
                        loading="lazy"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const t = e.currentTarget;
                          if (!t.src.endsWith('/placeholder.svg')) {
                            t.src = '/placeholder.svg';
                          }
                        }}
                      />
                      <CardContent sx={{ flexGrow: 1, pt: 2, pb: 1, color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={checked.includes(xid)}
                              onChange={e => handleCheck(xid, e.target.checked)}
                              color="primary"
                              sx={{ color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary' }}
                            />
                          }
                          label={<Typography variant="subtitle1" sx={{ fontWeight: 600, color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary' }}>{(p as any).name_translated ?? p.name_en ?? p.name ?? 'Unnamed'}</Typography>}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          {p.has_wikipedia && (
                            <Chip
                              size="small"
                              label={t(lang, 'wikipedia')}
                              color="info"
                              component="a"
                              clickable
                              href={`https://${(p.wikipedia?.split(':')[0] || 'en')}.wikipedia.org/wiki/${encodeURIComponent((p.wikipedia?.split(':')[1] || '').replace(/ /g, '_'))}`}
                              target="_blank"
                              rel="noopener"
                              sx={{
                                fontWeight: 600,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main,
                                color: (theme) => theme.palette.mode === 'dark' ? theme.palette.info.contrastText : theme.palette.getContrastText(theme.palette.info.main),
                                '&:hover': {
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.info.main : theme.palette.info.dark
                                }
                              }}
                            />
                          )}
                          {p.has_website && (
                            <Chip
                              size="small"
                              label={t(lang, 'website')}
                              color="success"
                              sx={{
                                fontWeight: 600,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.main,
                                color: (theme) => theme.palette.getContrastText(theme.palette.success.main)
                              }}
                            />
                          )}
                          {p.has_hours && (
                            <Chip
                              size="small"
                              label={t(lang, 'hours')}
                              color="warning"
                              sx={{
                                fontWeight: 600,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main,
                                color: (theme) => theme.palette.getContrastText(theme.palette.warning.main)
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ mb: 0.5, color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.secondary' }}>
                          {p.kinds ? `${p.kinds}` : 'place'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5, color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.secondary' }}>
                          {p.popularity ? `${t(lang, 'popularity')}: ${Math.round(p.popularity)}/200` : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>
            {/* Save button moved to sticky AppBar above */}
            {saveMsg && <Alert severity="success" sx={{ mt: 2 }}>{saveMsg}</Alert>}
          </>
        )}
      </Paper>
    </Box>
  );
}
