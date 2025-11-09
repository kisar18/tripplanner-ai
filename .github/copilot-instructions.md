## Quick context

- This repo is a small Trip Planner with a FastAPI backend (async, SQLAlchemy core + `databases`) and a Create-React-App TypeScript frontend (`frontend/tripplanner`).
- Backend entrypoint: `backend/main.py` (FastAPI app). Frontend entrypoint: `frontend/tripplanner/src/App.tsx`.

## Architecture (short)

- Backend: async FastAPI using SQLAlchemy Core `Table` definitions in `backend/models.py`, async engine in `backend/db.py` and the `databases` library for simple async queries. DB is SQLite at `sqlite+aiosqlite:///./tripplanner.db` (file created in the `backend` folder).
- Frontend: React (TypeScript) bootstrapped with Create React App, Material UI used for UI. Frontend fetches backend at `http://127.0.0.1:8000` (see `App.tsx`).
- Data flow: frontend POSTs JSON to `/save_trip` and GETs `/trips`. Backend saves rows to `trips` table defined in `backend/models.py` and returns rows via `database.fetch_all(query)`.

## Important files

- `backend/main.py` — FastAPI app and endpoints (/save_trip, /trips). Lifespan handler creates DB tables and connects the `databases.Database` instance.
- `backend/db.py` — DB URL, async engine, `metadata` and `database` instance. Modify here to change DB connection.
- `backend/models.py` — `trips` table definition (SQLAlchemy Core Table). Note: `itinerary` column is a String in the schema.
- `backend/crud.py` — intentionally empty placeholder for extracting DB logic from endpoints.
- `backend/requirements.txt` — Python dependencies for backend (install with pip).
- `frontend/tripplanner/src/App.tsx` — single-page UI; shows how frontend calls backend (hard-coded base URLs).
- `frontend/tripplanner/package.json` — frontend scripts: `start`, `build`, `test`.

## How to run (developer tasks)

1. Backend (PowerShell, run from `backend`):

   - Install dependencies: `python -m pip install -r requirements.txt`
   - Start dev server: `uvicorn main:app --reload --host 127.0.0.1 --port 8000`

   Notes: `main.py` performs `metadata.create_all` on startup using the async engine; the SQLite file `tripplanner.db` will be created next to `backend`.

2. Frontend (PowerShell, run from `frontend/tripplanner`):

   - Install deps: `npm install`
   - Start dev server: `npm start` (opens at http://localhost:3000)

3. Integration: Frontend expects backend at `http://127.0.0.1:8000` (see `fetch` calls in `App.tsx`). CORS is permissive (`allow_origins=['*']`) in `main.py`.

## Notes about patterns & gotchas (project-specific)

- The project uses SQLAlchemy Core tables + the `databases` library, not SQLAlchemy ORM classes. To add queries, use `trips.insert()`, `trips.select()` etc., or move logic into `backend/crud.py`.
- `itinerary` is stored as a string column but the frontend treats it as structured JSON in TypeScript (`Record<string,string>`). The backend currently stores whatever string is posted — be explicit about JSON encoding/decoding if you need structured queries.
- `crud.py` exists as a place to move DB calls out of `main.py` — if you add it, keep it async and use the `database` instance from `backend/db.py`.
- No tests or CI are present in the repo. Keep changes small and verify locally: start backend, then frontend, and exercise the UI to validate end-to-end behavior.

## Examples (useful snippets)

- Save trip payload (frontend -> backend):

```json
{ "city": "Prague", "days": 3, "itinerary": "Day1: ..." }
```

- Start backend (from `backend`):

```
python -m pip install -r requirements.txt; uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- Start frontend (from `frontend/tripplanner`):

```
npm install; npm start
```

## Where to look next (for contributors/agents)

- Add domain logic to `backend/crud.py` and keep `main.py` small. If adding models or migrations, prefer explicit SQLAlchemy Core definitions in `models.py` and ensure `metadata.create_all` is called on startup.
- If you change the DB URL or move to Postgres, edit `backend/db.py` and update `requirements.txt`.

---

If something here is unclear or you'd like the file to include additional examples (tests, recommended endpoint contracts, or a small dev script), tell me which parts to expand and I will iterate.
