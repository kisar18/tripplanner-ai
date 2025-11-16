from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import database, engine, metadata
from models import trips
from contextlib import asynccontextmanager
import math
import urllib.parse
import httpx
import time
import re
import unicodedata

# In-memory caches to reduce latency and repeated external calls
GEOCODE_CACHE: dict[str, tuple[float, float, float]] = {}  # city_lower -> (lon, lat, ts)
PLACES_CACHE: dict[tuple[str, str, int], tuple[float, list]] = {}  # (city_lower, category, radius) -> (ts, elements)
IMG_CACHE: dict[str, tuple[float, str]] = {}  # wikipedia "lang:title" -> (ts, image_url)

GEO_TTL = 24 * 60 * 60  # 24h
PLACES_TTL = 10 * 60    # 10m
IMG_TTL = 24 * 60 * 60  # 24h

class TripIn(BaseModel):
    city: str
    days: int
    description: str

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/save_trip")
async def save_trip(trip: TripIn):
    query = trips.insert().values(
        city=trip.city,
        days=trip.days,
        description=trip.description
    )
    await database.execute(query)
    return {"status": "saved"}

@app.get("/trips")
async def get_trips():
    query = trips.select()
    return await database.fetch_all(query)


@app.delete("/trips/{trip_id}")
async def delete_trip(trip_id: int):
    query = trips.delete().where(trips.c.id == trip_id)
    await database.execute(query)
    return {"status": "deleted"}


@app.get("/places/{city}")
async def places_for_city(city: str, radius: int = 5000, limit: int = 10, category: str = "all", with_images: bool = False):
    """Get interesting places around a city using Overpass API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        now = time.time()
        
        def normalize_image_url(raw: str | None) -> str | None:
            """Normalize OSM image tags and Wikipedia/Commons file links to direct image URLs.
            - Accept direct image URLs (common extensions or upload.wikimedia.org)
            - Convert Commons/Wikipedia File pages to Special:FilePath
            - Handle bare "File:Name.ext" values
            - Return None for non-image pages
            """
            if not raw:
                return None
            s = raw.strip()
            # If it's a bare Commons file title
            if s.lower().startswith("file:"):
                fname = s.split(":", 1)[1].strip().replace(" ", "_")
                return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
            # Commons/Wikipedia file description pages -> Special:FilePath
            if "commons.wikimedia.org/wiki/File:" in s or re.search(r"https?://[a-z]+\.wikipedia\.org/wiki/File:", s, re.I):
                # Extract substring starting at File:
                idx = s.lower().find("file:")
                if idx != -1:
                    fname = s[idx+5:].strip().replace(" ", "_")
                    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
            # Direct upload URLs or typical image extensions are fine
            if "upload.wikimedia.org/" in s or re.search(r"\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$", s, re.I):
                return s
            # Some people use Special:FilePath already
            if "/Special:FilePath/" in s:
                return s if "width=" in s else (s + ("&width=800" if "?" in s else "?width=800"))
            # Not a usable direct image
            return None
        
        # Get cached or fetch city coordinates
        cached_geo = GEOCODE_CACHE.get(city.lower())
        if cached_geo and (now - cached_geo[2] < GEO_TTL):
            lon, lat = cached_geo[0], cached_geo[1]
        else:
            try:
                nom_res = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": city, "format": "json", "limit": 1},
                    headers={"User-Agent": "TripPlannerAI/1.0"}
                )
                nom_res.raise_for_status()
                nom_data = nom_res.json()
                
                if nom_data and len(nom_data) > 0:
                    lon = float(nom_data[0]["lon"])
                    lat = float(nom_data[0]["lat"])
                    GEOCODE_CACHE[city.lower()] = (lon, lat, now)
                else:
                    raise HTTPException(status_code=404, detail=f"City '{city}' not found.")
            except httpx.HTTPError as e:
                raise HTTPException(status_code=500, detail=f"Geocoding error: {str(e)}")
        
        # Build Overpass query based on category (simplified "all" to avoid timeouts)
        query_filters = (
            f"node[tourism=museum](around:{radius},{lat},{lon});"
            f"way[tourism=museum](around:{radius},{lat},{lon});"
            f"relation[tourism=museum](around:{radius},{lat},{lon});"
        ) if category == "museums" else (
            f"node[leisure=park](around:{radius},{lat},{lon});"
            f"way[leisure=park](around:{radius},{lat},{lon});"
            f"relation[leisure=park](around:{radius},{lat},{lon});"
        ) if category == "parks" else (
            f"node[amenity=restaurant](around:{radius},{lat},{lon});"
            f"node[amenity=cafe](around:{radius},{lat},{lon});"
            f"way[amenity=restaurant](around:{radius},{lat},{lon});"
            f"way[amenity=cafe](around:{radius},{lat},{lon});"
        ) if category == "restaurants" else (
            f"node[historic](around:{radius},{lat},{lon});"
            f"way[historic](around:{radius},{lat},{lon});"
            f"relation[historic](around:{radius},{lat},{lon});"
        ) if category == "historic" else (
            f"node[tourism=attraction](around:{radius},{lat},{lon});"
            f"way[tourism=attraction](around:{radius},{lat},{lon});"
            f"relation[tourism=attraction](around:{radius},{lat},{lon});"
        ) if category == "attractions" else (
            f"node[tourism=viewpoint](around:{radius},{lat},{lon});"
            f"way[tourism=viewpoint](around:{radius},{lat},{lon});"
        ) if category == "viewpoints" else (
            # Simplified "all" - only query most important POI types to avoid timeout
            f"nwr[tourism~'museum|attraction'](around:{radius},{lat},{lon});"
            f"nwr[historic~'castle|monument'](around:{radius},{lat},{lon});"
            f"node[leisure=park](around:{radius},{lat},{lon});"
        )
        
        overpass_query = f"[out:json][timeout:30];({query_filters});out center qt;"
        
        # Get cached or fetch Overpass elements with retry on different servers
        cache_key = (city.lower(), category, radius)
        cached_places = PLACES_CACHE.get(cache_key)
        if cached_places and (now - cached_places[0] < PLACES_TTL):
            elements = cached_places[1]
        else:
            # Try multiple Overpass servers in case of timeout
            overpass_servers = [
                "https://overpass-api.de/api/interpreter",
                "https://overpass.kumi.systems/api/interpreter",
                "https://overpass.openstreetmap.ru/api/interpreter",
            ]
            
            elements = []
            last_error = None
            
            for server in overpass_servers:
                try:
                    places_res = await client.post(server, data=overpass_query, timeout=30)
                    places_res.raise_for_status()
                    elements = places_res.json().get("elements", [])
                    PLACES_CACHE[cache_key] = (now, elements)
                    break  # Success, exit loop
                except httpx.TimeoutException:
                    last_error = f"Timeout on {server}"
                    continue  # Try next server
                except httpx.HTTPError as e:
                    last_error = str(e)
                    if "504" in str(e) or "timeout" in str(e).lower():
                        continue  # Try next server on timeout
                    else:
                        raise HTTPException(status_code=500, detail=f"Places API error: {str(e)}")
            
            if not elements and last_error:
                raise HTTPException(status_code=503, detail=f"All Overpass servers failed. Try a more specific category or smaller radius. Last error: {last_error}")
        
        # Parse elements into POI list
        pois = []
        for elem in elements:
            elem_lat = elem.get("center", {}).get("lat") or elem.get("lat")
            elem_lon = elem.get("center", {}).get("lon") or elem.get("lon")
            if not elem_lat or not elem_lon:
                continue
            
            tags = elem.get("tags", {})
            distance = math.sqrt((elem_lat - lat)**2 + (elem_lon - lon)**2) * 111000
            
            # Build kinds list
            kinds = []
            for key in ["tourism", "leisure", "amenity"]:
                if tags.get(key):
                    kinds.append(tags[key])
            if tags.get("historic"):
                kinds.append("historic")
            
            # Calculate popularity score
            score = 0
            if tags.get("building") in ["basilica", "cathedral", "castle"]:
                score += 150
            if tags.get("historic") in ["yes", "castle", "monument"]:
                score += 100
            if tags.get("wikipedia"):
                score += 100
            if tags.get("wikidata"):
                score += 50
            if tags.get("opening_hours"):
                score += 30
            if tags.get("website"):
                score += 20
            if tags.get("phone") or tags.get("contact:phone"):
                score += 15
            if tags.get("email") or tags.get("contact:email"):
                score += 10
            if tags.get("fee"):
                score += 10
            if tags.get("operator"):
                score += 5
            if distance < 1000:
                score += 40
            elif distance < 3000:
                score += 20
            elif distance < 5000:
                score += 10
            
            # Prefer a normalized, truly-loadable image URL (may be None)
            normalized_img = normalize_image_url(tags.get("image"))
            pois.append({
                "xid": elem.get("id"),
                "name": tags.get("name", "Unnamed"),
                "dist": distance,
                "kinds": ", ".join(kinds) if kinds else "place",
                "point": {"lon": elem_lon, "lat": elem_lat},
                "popularity": score,
                "has_wikipedia": bool(tags.get("wikipedia")),
                "has_website": bool(tags.get("website")),
                "has_hours": bool(tags.get("opening_hours")),
                "wikipedia": tags.get("wikipedia"),
                "wikidata": tags.get("wikidata"),
                "image_url": normalized_img,
            })
        
        # Deduplicate: merge nodes/ways/relations for the same place
        def normalize_name(n: str) -> str:
            n = (n or "").strip()
            n = unicodedata.normalize("NFKD", n)
            n = n.encode("ascii", "ignore").decode("ascii")
            n = re.sub(r"\s+", " ", n).strip().casefold()
            return n

        def approx_distance_m(a, b) -> float:
            return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2) * 111000

        deduped: list[dict] = []
        for poi in pois:
            matched_idx = -1
            for i, existing in enumerate(deduped):
                same_entity = False
                # Strong keys: wikidata or wikipedia match
                if poi.get("wikidata") and existing.get("wikidata") and poi["wikidata"] == existing["wikidata"]:
                    same_entity = True
                elif poi.get("wikipedia") and existing.get("wikipedia") and poi["wikipedia"] == existing["wikipedia"]:
                    same_entity = True
                else:
                    # Fallback: same normalized name and very close coordinates
                    if normalize_name(poi.get("name")) == normalize_name(existing.get("name")):
                        p1 = (poi["point"]["lat"], poi["point"]["lon"])
                        p2 = (existing["point"]["lat"], existing["point"]["lon"])
                        if approx_distance_m(p1, p2) <= 200:
                            same_entity = True
                if same_entity:
                    matched_idx = i
                    break
            if matched_idx == -1:
                deduped.append(poi)
            else:
                ex = deduped[matched_idx]
                # Choose the better base entry
                better, other = (poi, ex) if poi.get("popularity", 0) > ex.get("popularity", 0) else (ex, poi)
                # Prefer closer to center if equal popularity
                if poi.get("popularity", 0) == ex.get("popularity", 0) and poi.get("dist", 1e9) < ex.get("dist", 1e9):
                    better, other = poi, ex
                # Merge a few useful fields
                if not better.get("image_url") and other.get("image_url"):
                    better["image_url"] = other["image_url"]
                if not better.get("wikipedia") and other.get("wikipedia"):
                    better["wikipedia"] = other["wikipedia"]
                better["has_website"] = bool(better.get("has_website") or other.get("has_website"))
                better["has_hours"] = bool(better.get("has_hours") or other.get("has_hours"))
                # Replace
                deduped[matched_idx] = better

        pois = deduped

        # Sort and apply limit after deduplication
        pois.sort(key=lambda p: (-p.get("popularity", 0), p.get("dist", float("inf"))))
        pois = pois[:limit]

        if with_images:
            for poi in pois:
                # Only fetch from Wikipedia if we don't already have a valid direct image
                if poi.get("image_url") or not poi.get("wikipedia"):
                    continue
                wp = poi["wikipedia"]
                if ":" not in wp:
                    continue
                
                cached_img = IMG_CACHE.get(wp)
                now_local = time.time()
                if cached_img and (now_local - cached_img[0] < IMG_TTL):
                    poi["image_url"] = cached_img[1]
                    continue
                
                try:
                    lang, title = wp.split(":", 1)
                    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'))}"
                    r = await client.get(url, headers={"User-Agent": "TripPlannerAI/1.0"}, timeout=8)
                    if r.status_code == 200:
                        j = r.json()
                        img = (j.get("thumbnail") or {}).get("source") or (j.get("originalimage") or {}).get("source")
                        if img:
                            poi["image_url"] = img
                            IMG_CACHE[wp] = (now_local, img)
                except:
                    pass
        
        return {"city": city, "lon": lon, "lat": lat, "places": pois}