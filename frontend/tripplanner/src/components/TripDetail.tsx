import React, { useEffect, useState, useMemo } from "react";
import { Box, Button, Paper, Typography, CircularProgress, Alert, Link, ToggleButton, ToggleButtonGroup, TextField, Card, CardMedia, CardContent, Chip } from "@mui/material";
import { Trip } from "../types";

interface POI {
  xid?: string;
  name?: string;
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
  const [places, setPlaces] = useState<POI[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  const url = `http://127.0.0.1:8000/places/${encodeURIComponent(trip.city)}?category=${category}&limit=10&with_images=true`;
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
  }, [trip.city, category]);

  const filteredPlaces = useMemo(() => 
    places?.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kinds?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? null,
    [places, searchQuery]
  );

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
        <Typography sx={{ mt: 2 }}><strong>Description</strong></Typography>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {pretty}
        </Paper>

        <Typography variant="h6" sx={{ mt: 3 }}>Interesting places nearby</Typography>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <ToggleButtonGroup
            value={category}
            exclusive
            onChange={(e, newCategory) => newCategory && setCategory(newCategory)}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="museums">Museums</ToggleButton>
            <ToggleButton value="parks">Parks</ToggleButton>
            <ToggleButton value="restaurants">Restaurants</ToggleButton>
            <ToggleButton value="attractions">Attractions</ToggleButton>
            <ToggleButton value="historic">Historic</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        {loading && <CircularProgress size={24} sx={{ mt: 1 }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {!loading && places && places.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No places found. Try{" "}
            <Link href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(trip.city)}`} target="_blank" rel="noopener">
              OpenStreetMap
            </Link>
            {" "}or{" "}
            <Link href={`https://www.google.com/maps/search/${encodeURIComponent(trip.city)}`} target="_blank" rel="noopener">
              Google Maps
            </Link>
            .
          </Alert>
        )}
        {!loading && filteredPlaces && filteredPlaces.length === 0 && places && places.length > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No places match "{searchQuery}".
          </Alert>
        )}
        {filteredPlaces && filteredPlaces.length > 0 && (
          <>
            <Typography variant="body2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
              {filteredPlaces.length} {filteredPlaces.length !== places?.length && `of ${places?.length}`} places
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr'
              },
              gap: 2
            }}>
              {filteredPlaces.map((p, i) => {
                const img = p.image_url || '/placeholder.svg';
                return (
                  <Box key={p.xid ?? i}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardMedia
                        component="img"
                        image={img}
                        alt={p.name || 'place'}
                        sx={{ height: 160, objectFit: 'cover' }}
                        loading="lazy"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const t = e.currentTarget;
                          if (!t.src.endsWith('/placeholder.svg')) {
                            t.src = '/placeholder.svg';
                          }
                        }}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {p.name ?? 'Unnamed'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          {p.has_wikipedia && <Chip size="small" label="Wikipedia" />}
                          {p.has_website && <Chip size="small" label="Website" />}
                          {p.has_hours && <Chip size="small" label="Hours" />}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {p.kinds ? `${p.kinds}` : 'place'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof p.dist === 'number' ? `${Math.round(p.dist)} m` : ''}
                          {p.popularity ? ` — Popularity: ${Math.round(p.popularity)}/200` : ''}
                        </Typography>
                        {(
                          p.wikipedia || (p.point && typeof p.point.lat === 'number' && typeof p.point.lon === 'number')
                        ) && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {p.wikipedia ? (
                              <Link
                                href={`https://${(p.wikipedia.split(':')[0] || 'en')}.wikipedia.org/wiki/${encodeURIComponent((p.wikipedia.split(':')[1] || '').replace(/ /g, '_'))}`}
                                target="_blank"
                                rel="noopener"
                              >
                                Details
                              </Link>
                            ) : (
                              <Link
                                href={`https://www.openstreetmap.org/?mlat=${p.point!.lat}&mlon=${p.point!.lon}#map=16/${p.point!.lat}/${p.point!.lon}`}
                                target="_blank"
                                rel="noopener"
                              >
                                Details
                              </Link>
                            )}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
