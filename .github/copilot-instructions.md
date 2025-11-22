## Quick context

- Trip Planner app with FastAPI backend (async, SQLAlchemy Core + databases) and Create-React-App TypeScript frontend.
- Backend: backend/main.py (FastAPI). Frontend: frontend/tripplanner/src/App.tsx.
- **Key feature**: Finds interesting places via OpenStreetMap/Overpass API, enriches with Wikipedia/Wikidata images, exports PDFs with images.

## Architecture

### Backend
- **FastAPI** with async SQLAlchemy Core (no ORM) + databases library for queries
- **Database**: SQLite at sqlite+aiosqlite:///./tripplanner.db (created in backend/ folder)
- **Tables**: trips table in backend/models.py with columns: id, city, days, description, places_to_visit (JSON string)
- **Caching**: In-memory caches for geocoding (24h TTL), places (10m TTL), images (24h TTL) for fast responses
- **External APIs**:
  - Nominatim (geocoding)
  - Overpass API (OpenStreetMap POI data)
  - Wikipedia REST API (thumbnails)
  - Wikidata API (P18 property for Commons images, labels for translations)
- **PDF generation**: reportlab with images downloaded from Wikipedia/Commons

### Frontend
- **React TypeScript** with Material-UI components
- **Theme**: Dark/light mode toggle with persistent state
- **i18n**: Multi-language support (en, cs, es) with LanguageContext
- **Components**:
  - TripForm.tsx - Create trips
  - TripTable.tsx - List all trips
  - TripDetail.tsx - View trip, browse/select places, export PDF
  - LanguageSwitcher.tsx, ThemeToggle.tsx - UI controls
- Base URL: http://127.0.0.1:8000

## Important files

### Backend
- backend/main.py (605 lines)  Main FastAPI app with 6 endpoints:
  - POST /save_trip - Create trip
  - GET /trips - List all trips with placesToVisit
  - DELETE /trips/{trip_id} - Delete trip
  - PATCH /trips/{trip_id}/places - Save selected places (xids) for trip
  - GET /trips/{trip_id}/export/pdf - Export trip as PDF with images
  - GET /places/{city} - Get POIs with optional images & translations
- backend/db.py  Database setup (engine, metadata, database instance)
- backend/models.py  trips Table definition
- backend/pdf_generator.py  PDF generation with images (async download, reportlab)
- backend/image_enrichment.py  Image enrichment from Wikipedia/Wikidata (3-pass strategy)
- backend/requirements.txt  Dependencies including httpx, reportlab, databases, fastapi

### Frontend
- frontend/tripplanner/src/App.tsx  Main router with dark/light theme
- frontend/tripplanner/src/components/TripDetail.tsx  POI browsing, image display, place selection, PDF export
- frontend/tripplanner/src/language/  i18n context and translations (en, cs, es)
- frontend/tripplanner/src/theme/  Material-UI theme configuration

## How to run

### Backend (PowerShell from backend/)
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000

Note: main.py auto-creates tables on startup; migrates places_to_visit column if missing

### Frontend (PowerShell from frontend/tripplanner/)
npm install
npm start

Opens at http://localhost:3000

## Key patterns & gotchas

### Backend
- **SQLAlchemy Core** (not ORM): Use trips.insert(), trips.select(), etc.
- **places_to_visit**: Stored as JSON string (['xid1', 'xid2']), parsed in /trips endpoint to placesToVisit array
- **Image enrichment**: 3-pass strategy for reliability:
  1. Wikipedia REST summary API (lang:title format)
  2. Wikidata P18 property (batch fetch for Commons filenames)
  3. Wikipedia pageimages API (fallback)
- **User-Agent CRITICAL**: Wikipedia/Wikidata/Commons require Mozilla/5.0 (compatible; TripPlannerAI/1.0; +https://github.com/kisar18/tripplanner-ai) or return 403
- **PDF metadata**: Use title and author params in SimpleDocTemplate for browser tab display
- **Caching**: Global dicts (GEOCODE_CACHE, PLACES_CACHE, IMG_CACHE) with timestamps for TTL
- **Deduplication**: Places matched by wikidata/wikipedia/name+distance to avoid duplicates from Overpass

### Frontend
- **Type handling**: Place xid can be number or string - always normalize with String(xid) for comparisons
- **Place display**: Shows name_translated (preferred)  name_en  name based on selected language
- **Image fallback**: Uses /placeholder.svg if image_url is null
- **PDF export**: Calls /trips/{id}/export/pdf, creates blob URL, triggers download with filename from Content-Disposition

## API Endpoints

POST   /save_trip              - Create trip (city, days, description)
GET    /trips                  - List trips with placesToVisit array
DELETE /trips/{trip_id}        - Delete trip
PATCH  /trips/{trip_id}/places - Update places_to_visit (JSON array of xids)
GET    /trips/{trip_id}/export/pdf - Export PDF (filename: TripPlanner_{city}_{days}days.pdf, title: Trip to {city} - {days} days)
GET    /places/{city}          - Get POIs with optional images/translations
       ?category=all|museums|parks|restaurants|historic|attractions|viewpoints
       &with_images=true       - Enrich with Wikipedia/Wikidata images
       &lang=en|cs|es          - Translate names via Wikidata labels
       &radius=5000            - Search radius in meters
       &limit=10               - Max results

## Common tasks

### Add new endpoint
1. Define Pydantic model if needed (see TripIn, PlacesIn)
2. Add route in main.py with @app.get/post/patch/delete
3. Use await database.execute(query) or await database.fetch_all(query)

### Modify places scoring
- Edit scoring logic in /places/{city} endpoint (~line 350-370)
- Current factors: building type, historic tag, wikipedia, wikidata, opening_hours, website, distance

### Add new language
1. Add translations to frontend/tripplanner/src/language/i18n.ts
2. Update SUPPORTED_LANGS in frontend/tripplanner/src/language/LanguageContext.tsx
3. Backend supports any 2-letter ISO code for Wikidata labels

### Debug image issues
- Check User-Agent header in all Wikipedia/Wikidata/Commons requests
- Verify image_url normalization (File:, Category:, Special:FilePath, direct URLs)
- Check IMG_CACHE for cached failures

## Dependencies

### Backend (key packages)
- fastapi==0.120.2
- databases==0.9.0 (async query interface)
- httpx==0.24.1 (external API calls)
- reportlab==4.0.9 (PDF generation)
- SQLAlchemy==2.0.44 (Core only)
- aiosqlite==0.21.0 (async SQLite driver)

### Frontend (key packages)
- react 18.x + TypeScript
- @mui/material (Material-UI components)
- React Router (navigation)

## Testing/Validation
- No automated tests - validate manually by:
  1. Create trip in UI
  2. View trip, check places load with images
  3. Select places, click Save Places to Visit
  4. Export PDF, verify images appear in document
  5. Check browser tab shows proper PDF title

---

For questions about implementation details, check inline comments in main.py (places endpoint, image enrichment) or TripDetail.tsx (POI display logic).
