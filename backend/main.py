from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import database, engine, metadata
from models import trips
from contextlib import asynccontextmanager
import os
from fastapi import HTTPException
import httpx

# Definujeme vstupní model
class TripIn(BaseModel):
    city: str
    days: int
    itinerary: str

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # nebo ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/save_trip")
async def save_trip(trip: TripIn):
    query = trips.insert().values(
        city=trip.city,
        days=trip.days,
        itinerary=trip.itinerary
    )
    await database.execute(query)
    return {"status": "saved"}

@app.get("/trips")
async def get_trips():
    query = trips.select()
    return await database.fetch_all(query)


@app.delete("/trips/{trip_id}")
async def delete_trip(trip_id: int):
    # Delete a trip by id
    query = trips.delete().where(trips.c.id == trip_id)
    await database.execute(query)
    return {"status": "deleted"}


# Proxy endpoint for OpenTripMap places (secure: keep API key on server)
@app.get("/places/{city}")
async def places_for_city(city: str, radius: int = 5000, limit: int = 20):
    OTM_KEY = os.getenv("OPENTRIPMAP_KEY")
    if not OTM_KEY:
        raise HTTPException(status_code=500, detail="OPENTRIPMAP_KEY not configured on server")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Resolve city to coordinates
        geo_res = await client.get(
            "https://api.opentripmap.com/0.1/en/places/geoname",
            params={"name": city, "apikey": OTM_KEY},
        )
        if geo_res.status_code != 200:
            raise HTTPException(status_code=geo_res.status_code, detail=f"Geoname lookup failed: {geo_res.text}")
        geo = geo_res.json()
        lon = geo.get("lon")
        lat = geo.get("lat")
        if lon is None or lat is None:
            raise HTTPException(status_code=404, detail="City not found")

        # Get places by radius
        places_res = await client.get(
            "https://api.opentripmap.com/0.1/en/places/radius",
            params={"radius": radius, "lon": lon, "lat": lat, "limit": limit, "apikey": OTM_KEY},
        )
        places_res.raise_for_status()
        data = places_res.json()

        # Normalize to a simple list of POIs: try to extract from GeoJSON 'features' or return list directly
        pois = []
        if isinstance(data, dict) and "features" in data:
            for f in data.get("features", []):
                props = f.get("properties", {})
                geom = f.get("geometry") or {}
                coords = None
                if geom and "coordinates" in geom:
                    coords = {"lon": geom["coordinates"][0], "lat": geom["coordinates"][1]} if isinstance(geom["coordinates"], list) else None
                pois.append({
                    "xid": props.get("xid"),
                    "name": props.get("name"),
                    "dist": props.get("dist"),
                    "kinds": props.get("kinds"),
                    "point": coords,
                })
        elif isinstance(data, list):
            pois = data
        else:
            # Fallback - return raw
            return data

        return {"city": city, "lon": lon, "lat": lat, "places": pois}