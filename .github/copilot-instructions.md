## Quick context

- Trip Planner app with FastAPI backend (async, SQLAlchemy Core + databases) and Create-React-App TypeScript frontend.
- Backend: backend/main.py (FastAPI). Frontend: frontend/tripplanner/src/App.tsx.
- **Key feature**: Finds interesting places via OpenStreetMap/Overpass API, enriches with Wikipedia/Wikidata images, exports PDFs with images.
- **Architecture**: Modular backend (pdf_generator.py, image_enrichment.py), component-based frontend with unified styling (PageContainer, glassmorphism navigation, luxury table design).

## Architecture

### Backend
- **FastAPI** with async SQLAlchemy Core (no ORM) + databases library for queries
- **Database**: SQLite at sqlite+aiosqlite:///./tripplanner.db (created in backend/ folder)
- **Tables**: trips table in backend/models.py with columns: id, city, days, description, places_to_visit (JSON string)
- **Caching**: In-memory caches for geocoding (24h TTL), places (10m TTL), images (24h TTL), names (24h TTL) for fast responses
- **External APIs**:
  - Nominatim (geocoding)
  - Overpass API (OpenStreetMap POI data - 3 fallback servers)
  - Wikipedia REST API (summary endpoint for thumbnails)
  - Wikidata API (P18 property for Commons images, labels for name translations)
- **PDF generation**: reportlab with async image downloading from Wikipedia/Commons
- **Modular structure**: 
  - main.py - FastAPI app, endpoints, caching logic
  - pdf_generator.py - PDF creation with images
  - image_enrichment.py - 3-pass image enrichment strategy
  - models.py - SQLAlchemy Table definitions
  - db.py - Database engine and connection

### Frontend
- **React 19** + **TypeScript** with Material-UI v7
- **Router**: react-router-dom v6 with nested AppShell component for hooks
- **Theme**: Dark/light mode with ColorModeContext, persistent localStorage state
- **i18n**: Multi-language support (en, cs, es) with LanguageContext, translation function t(lang, key)
- **Styling**: 
  - Glassmorphism navigation with dynamic active route highlighting
  - PageContainer wrapper component for unified backgrounds (scenic image on homepage, gradients elsewhere)
  - Luxury table design with backdrop blur, gradient headers, alternating rows, slide-in hover
  - Semi-transparent blurred cards for readability over background images
- **State Management**: 
  - Lifted state pattern for TripDetail actions (Export PDF, Save Places moved from component to global menu)
  - registerActions callback pattern to connect child component handlers to parent AppBar buttons
- **Components**:
  - App.tsx - Main router, AppShell with global navigation and action buttons
  - PageContainer.tsx - Unified background wrapper with optional scenic image
  - HomePage.tsx - Landing page with hero section
  - CreateTripPage.tsx - Trip creation form
  - MyTripsPage.tsx - Trip list with luxury table
  - TripDetailPage.tsx - Trip detail container with action registration
  - TripForm.tsx - Form component for creating trips
  - TripTable.tsx - Luxury styled table for trip listing
  - TripDetail.tsx - Trip details and POI browsing (presentation component)
  - LanguageSwitcher.tsx, ThemeToggle.tsx - UI controls
- Base URL: http://127.0.0.1:8000

## Important files

### Backend
- **backend/main.py** (650+ lines) - Main FastAPI app with 6 endpoints:
  - POST /save_trip - Create trip (city, days, description)
  - GET /trips - List all trips with placesToVisit parsed from JSON
  - DELETE /trips/{trip_id} - Delete trip by ID
  - PATCH /trips/{trip_id}/places - Save selected places (xids) for trip as JSON
  - GET /trips/{trip_id}/export/pdf - Export trip as PDF with images (filename: TripPlanner_{city}_{days}days.pdf)
  - GET /places/{city} - Get POIs with optional images & translations (category, with_images, lang, radius, limit params)
  - **Key functions**: init_db() for table creation/migration, lifespan for DB connection, approx_distance_m() for deduplication, normalize_name() for matching
  
- **backend/pdf_generator.py** - PDF generation module using reportlab:
  - generate_trip_pdf() - Main function returning BytesIO buffer
  - _add_places_with_images() - Async batch image download, renders place cards with images
  - Uses SimpleDocTemplate with title/author metadata for browser tab display
  - Images downloaded via httpx with Mozilla User-Agent
  
- **backend/image_enrichment.py** - Image enrichment with 3-pass strategy:
  - enrich_places_with_images() - Main enrichment function (modifies places in-place)
  - Pass 1: Wikipedia REST summary API (lang:title format) for thumbnails
  - Pass 2: Wikidata P18 batch fetch for Commons filenames
  - Pass 3: Wikipedia pageimages API fallback
  - normalize_image_url() - Converts File: prefix, Category: filtering, bare filenames to Commons URLs
  - Critical: USER_AGENT constant required for all Wikipedia/Wikidata requests (403 without it)
  
- **backend/models.py** - SQLAlchemy Table definitions:
  - trips Table: id (PK), city, days, description, places_to_visit (TEXT for JSON array)
  
- **backend/db.py** - Database setup:
  - DATABASE_URL = "sqlite+aiosqlite:///./tripplanner.db"
  - engine (async SQLAlchemy engine with echo=True)
  - metadata (MetaData instance)
  - database (databases.Database instance)
  
- **backend/requirements.txt** - Dependencies:
  - fastapi==0.120.2, databases==0.9.0, SQLAlchemy==2.0.44, aiosqlite==0.21.0
  - httpx==0.24.1 (external API calls), reportlab==4.0.9 (PDF generation)

### Frontend

#### Core Files
- **frontend/tripplanner/src/App.tsx** - Main router and navigation:
  - BrowserRouter wraps AppShell nested component (for useLocation hook)
  - AppShell contains global AppBar with glassmorphism navigation and conditional action buttons
  - Navigation buttons: 3-button group with dynamic .active class based on route
  - Action buttons: Export PDF, Save Places (only shown on trip detail route via registerActions callback)
  - Routes: / (HomePage), /create (CreateTripPage), /trips (MyTripsPage), /trip/:id (TripDetailPage)
  
- **frontend/tripplanner/src/components/PageContainer.tsx** - Unified background wrapper:
  - forwardRef component for Fade compatibility
  - Props: children, padTop (default 8), image (boolean - when true shows scenic photo)
  - Background logic: image prop → scenic photo from Unsplash; no image → gradients (light: dual radial overlay, dark: pure gradient)
  - Noise texture overlay at 6% opacity
  
- **frontend/tripplanner/src/index.tsx** - Root with ColorModeContext and LanguageContext providers

#### Pages
- **frontend/tripplanner/src/pages/HomePage.tsx** - Landing page:
  - Uses `<PageContainer image>` for scenic background
  - Hero section in semi-transparent blurred box (rgba 75% light, 80% dark, backdrop-blur 12px)
  - Cards at 90% opacity (light) / 85% (dark) with explicit text colors
  - Planned Trips button: solid white background in dark mode
  
- **frontend/tripplanner/src/pages/CreateTripPage.tsx** - Trip creation:
  - Wrapped in PageContainer (no image, gradient background)
  - Contains TripForm component
  
- **frontend/tripplanner/src/pages/MyTripsPage.tsx** - Trip listing:
  - Wrapped in PageContainer (gradient background)
  - Contains TripTable component with luxury styling
  
- **frontend/tripplanner/src/pages/TripDetailPage.tsx** - Trip detail container:
  - Wrapped in PageContainer (gradient background matching MyTripsPage)
  - Lifts checked state (string[]), exporting/saving states from TripDetail
  - registerActions useEffect: passes { exportPdf, savePlaces, exporting, hasSelection } to parent App
  - Cleanup: registerActions(null) on unmount or when not on trip detail route
  - exportPdf: fetches PDF blob, creates download link with filename from trip data
  - savePlaces: PATCH request to /trips/{id}/places with checked xids
  
#### Components
- **frontend/tripplanner/src/components/TripForm.tsx** - Trip creation form:
  - Glassmorphism card with gradient accent bubble
  - Fields: city, days, description
  - POST to /save_trip on submit
  
- **frontend/tripplanner/src/components/TripTable.tsx** - Luxury styled trip table:
  - 2rem border radius, backdrop-blur 16px
  - Gradient header (135deg indigo-purple) with uppercase labels
  - Alternating row backgrounds (different opacity for light/dark)
  - Hover: slide-in transform (translateX 8px, scale 1.01), inset 4px accent border
  - Delete button: 2px border, 1rem radius, scale 1.05 on hover
  
- **frontend/tripplanner/src/components/TripDetail.tsx** - Trip details presentation:
  - Props: trip, checked, setChecked (lifted state from parent)
  - Fetches POIs from /places/{city}?category={cat}&with_images=true&lang={lang}
  - Category filter: all, museums, parks, restaurants, attractions, historic
  - Search filter: filters by name_translated/name_en/name or kinds
  - POI cards: 3-column grid (responsive), 170px image height, checkbox for selection
  - Displays: name_translated (preferred) → name_en → name, kinds, popularity score, Wikipedia/website/hours chips
  - Image fallback: /placeholder.svg on error
  - useMemo for filteredPlaces (required for performance)
  
- **frontend/tripplanner/src/components/LanguageSwitcher.tsx** - Language toggle:
  - Buttons for en, cs, es
  - Updates LanguageContext
  
- **frontend/tripplanner/src/components/ThemeToggle.tsx** - Dark/light mode toggle:
  - IconButton with moon/sun icons
  - Updates ColorModeContext

#### Context & Utilities
- **frontend/tripplanner/src/language/i18n.ts** - Translation dictionaries:
  - Dictionaries for en, cs, es with 30+ keys
  - t(lang, key) function returns translated string with fallback to en
  
- **frontend/tripplanner/src/language/LanguageContext.tsx** - Language context:
  - LanguageCode type: 'en' | 'cs' | 'es'
  - Persistent localStorage ('tripPlannerLang')
  
- **frontend/tripplanner/src/theme/ColorModeContext.ts** - Theme context:
  - ColorMode type: 'light' | 'dark'
  - toggleColorMode function

#### Configuration
- **frontend/tripplanner/package.json** - Dependencies:
  - react@19.2.0, react-dom@19.2.0, react-router-dom@6.30.2
  - @mui/material@7.3.4, @emotion/react@11.14.0, @emotion/styled@11.14.1
  - typescript@4.9.5
  - Scripts: start (react-scripts start), build, test

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
- **SQLAlchemy Core** (not ORM): Use trips.insert(), trips.select(), trips.update(), trips.delete() queries with await database.execute() or await database.fetch_all()
- **places_to_visit**: Stored as JSON string (['xid1', 'xid2']), parsed in /trips endpoint to placesToVisit array for frontend
- **Image enrichment**: 3-pass strategy for reliability:
  1. Wikipedia REST summary API (lang:title format, e.g., "en:London" → https://en.wikipedia.org/api/rest_v1/page/summary/London)
  2. Wikidata P18 property batch fetch (up to 50 QIDs) for Commons filenames (File:*.jpg)
  3. Wikipedia pageimages API fallback (query API with prop=pageimages)
- **User-Agent CRITICAL**: Wikipedia/Wikidata/Commons require `Mozilla/5.0 (compatible; TripPlannerAI/1.0; +https://github.com/kisar18/tripplanner-ai)` or return 403
- **PDF metadata**: Use title and author params in SimpleDocTemplate for browser tab display (title: "Trip to {city} - {days} days", author: "TripPlanner AI")
- **Caching**: Global dicts (GEOCODE_CACHE, PLACES_CACHE, IMG_CACHE, NAME_CACHE) with timestamps for TTL checks
- **Deduplication**: Places matched by wikidata/wikipedia/name+distance (<= 200m) to avoid duplicates from Overpass; keeps higher popularity/closer entry
- **Overpass fallback**: 3 servers tried in sequence (overpass-api.de → kumi.systems → openstreetmap.ru) with timeout/504 handling
- **Name translation**: Prefers OSM name:{lang} tag, falls back to Wikidata labels API batch fetch (wbgetentities with props=labels)
- **Image tag filtering**: Skips Category: values from OSM tags (too generic), prefers explicit image/wikimedia_commons tags, normalizes to Commons URLs
- **Distance calculation**: approx_distance_m() uses simple Euclidean formula * 111000 for rough meter estimate (good enough for city-scale)

### Frontend
- **Type handling**: Place xid can be number or string - always normalize with String(xid) for comparisons in checked array
- **Place display**: Shows name_translated (preferred) → name_en → name based on selected language (Wikidata labels or OSM name:{lang} tags)
- **Image fallback**: Uses /placeholder.svg if image_url is null; onError handler prevents infinite loops
- **PDF export**: Calls /trips/{id}/export/pdf, creates blob URL, triggers download with filename from Content-Disposition or constructed from trip data
- **registerActions pattern**: TripDetailPage registers action handlers with App via callback; cleanup with registerActions(null) on unmount prevents stale closures
- **PageContainer image prop**: Boolean prop determines scenic photo (homepage) vs gradient background (other pages); forwardRef required for Fade transitions
- **Dynamic navigation**: useLocation pathname matched against route patterns; .active class applied with enhanced styling (gradient background, shadow, larger font)
- **Glassmorphism**: backdrop-blur 6-16px, semi-transparent backgrounds (rgba with 2-8% alpha), box shadows with low alpha for depth
- **Theme-aware styling**: Most components use theme.palette.mode === 'dark' checks for conditional colors/backgrounds; gradients differ between themes
- **Luxury table hover**: transform: translateX(8px) scale(1.01) + inset border + gradient background for premium feel
- **useMemo required**: filteredPlaces in TripDetail must use useMemo to avoid recomputing on every render (TypeScript strict mode will catch missing dependency array)
- **Translation keys**: All user-facing text must use t(lang, 'key') from i18n.ts; missing keys fall back to English
- **State lifting**: TripDetail is stateless regarding actions (export, save); TripDetailPage owns state and registers handlers with global menu

## API Endpoints

POST   /save_trip              - Create trip (city, days, description)
GET    /trips                  - List trips with placesToVisit array
DELETE /trips/{trip_id}        - Delete trip
PATCH  /trips/{trip_id}/places - Update places_to_visit (JSON array of xids)
GET    /trips/{trip_id}/export/pdf - Export PDF (filename: TripPlanner_{city}_{days}days.pdf, title: Trip to {city} - {days} days)
GET    /places/{city}          - Get POIs with optional images/translations
       ?category=all|museums|parks|restaurants|historic|attractions|viewpoints
       &with_images=true       - Enrich with Wikipedia/Wikidata images (3-pass strategy)
       &lang=en|cs|es          - Translate names via Wikidata labels (batch fetch) or OSM name:{lang} tags
       &radius=5000            - Search radius in meters (default 5000)
       &limit=10               - Max results (default 10, applied after deduplication and scoring)

## Common tasks

### Add new endpoint
1. Define Pydantic model if needed (see TripIn, PlacesIn in main.py)
2. Add route in main.py with @app.get/post/patch/delete decorator
3. Use await database.execute(query) or await database.fetch_all(query) with SQLAlchemy Core queries
4. Return JSON response (FastAPI auto-serializes Pydantic models and dicts)

### Modify places scoring
- Edit scoring logic in /places/{city} endpoint (main.py ~line 350-370)
- Current factors: building type (basilica/cathedral/castle), historic tag, wikipedia, wikidata, opening_hours, website, phone, email, fee, operator, distance from center
- Score thresholds: basilica/cathedral/castle +150, historic +100, wikipedia +100, wikidata +50, opening_hours +30, website +20, phone +15, email +10, fee +10, operator +5
- Distance bonus: <1km +40, <3km +20, <5km +10

### Add new language
1. Add translations to frontend/tripplanner/src/language/i18n.ts (follow en/es/cs structure with 30+ keys)
2. Update SUPPORTED_LANGS type in frontend/tripplanner/src/language/LanguageContext.tsx
3. Backend supports any 2-letter ISO code for Wikidata labels (no code changes needed)
4. OSM name:{lang} tags automatically used if available

### Debug image issues
- Check User-Agent header in all Wikipedia/Wikidata/Commons requests (must be Mozilla/5.0 compatible string)
- Verify image_url normalization (File:, Category:, Special:FilePath, direct URLs) in image_enrichment.py
- Check IMG_CACHE for cached failures (24h TTL may persist errors)
- Test 3-pass strategy: Wikipedia REST summary → Wikidata P18 → Wikipedia pageimages
- Verify normalize_image_url() handles File: prefix and skips Category: values

### Add new page
1. Create page component in frontend/tripplanner/src/pages/{PageName}.tsx
2. Wrap content in `<PageContainer>` (add `image` prop for scenic background if desired)
3. Add route in App.tsx Routes section with path and element
4. Add navigation button to navItems array in AppShell if needed (with path and optional match function for dynamic highlighting)
5. Add translation keys to i18n.ts for all languages

### Modify table styling
- Edit TripTable.tsx sx props for theme-aware styling
- Key styles: borderRadius (2rem), backdropFilter (blur 16px), gradient headers, alternating row backgrounds
- Hover effects in TableRow sx: transform, boxShadow, inset border with theme.palette colors
- Use theme.palette.mode === 'dark' checks for conditional styling

### Add new category filter
1. Add category to /places/{city} endpoint in main.py (follow museums/parks pattern)
2. Construct Overpass query with appropriate tags (node[tag=value](around:radius,lat,lon); way[...]; relation[...];)
3. Add translation key to i18n.ts (en/es/cs) for category label
4. Add ToggleButton to TripDetail.tsx category filter group

## Dependencies

### Backend (key packages)
- fastapi==0.120.2
- databases==0.9.0 (async query interface for SQLAlchemy Core)
- httpx==0.24.1 (external API calls with async support)
- reportlab==4.0.9 (PDF generation)
- SQLAlchemy==2.0.44 (Core only, no ORM)
- aiosqlite==0.21.0 (async SQLite driver)
- uvicorn==0.38.0 (ASGI server)
- pydantic==2.12.3 (request/response validation)

### Frontend (key packages)
- react@19.2.0 + react-dom@19.2.0
- typescript@4.9.5
- @mui/material@7.3.4 (Material-UI components)
- @emotion/react@11.14.0 + @emotion/styled@11.14.1 (CSS-in-JS)
- react-router-dom@6.30.2 (navigation)
- react-scripts@5.0.1 (build tooling)

## Testing/Validation
- No automated tests - validate manually by:
  1. Create trip in UI (HomePage → Add New Trip)
  2. View trip detail, check places load with images
  3. Select places via checkboxes, click Save Places to Visit in global menu
  4. Export PDF via global menu button, verify images appear in document
  5. Check browser tab shows proper PDF title ("Trip to {city} - {days} days")
  6. Test category filters (all, museums, parks, restaurants, attractions, historic)
  7. Test search filter for place names/kinds
  8. Verify theme toggle (light/dark) applies to all pages
  9. Verify language switcher (en/cs/es) translates UI and place names

---

For questions about implementation details, check inline comments in main.py (places endpoint ~line 200-450, image enrichment integration), pdf_generator.py (image download logic), image_enrichment.py (3-pass strategy), App.tsx (registerActions pattern), TripDetailPage.tsx (state lifting), or TripDetail.tsx (POI display logic with useMemo).
