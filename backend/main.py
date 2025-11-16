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

def normalize_name(n: str) -> str:
    n = (n or "").strip()
    n = unicodedata.normalize("NFKD", n)
    n = n.encode("ascii", "ignore").decode("ascii")
    n = re.sub(r"\s+", " ", n).strip().casefold()
    return n

def approx_distance_m(a, b) -> float:
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2) * 111000

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


NAME_CACHE: dict[str, tuple[float, dict[str, str]]] = {}  # wikidata_id -> (ts, {lang: label})
NAME_TTL = 24 * 60 * 60

@app.get("/places/{city}")
async def places_for_city(city: str, radius: int = 5000, limit: int = 10, category: str = "all", with_images: bool = False, lang: str = "en"):
    """Return interesting places with optional English translation and image enrichment."""
    now = time.time()
    async with httpx.AsyncClient(timeout=30.0) as client:
        def normalize_image_url(raw: str | None) -> str | None:
            if not raw:
                return None
            s = raw.strip()
            if s.lower().startswith("file:"):
                fname = s.split(":", 1)[1].strip().replace(" ", "_")
                return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
            if "commons.wikimedia.org/wiki/File:" in s or re.search(r"https?://[a-z]+\.wikipedia\.org/wiki/File:", s, re.I):
                idx = s.lower().find("file:")
                if idx != -1:
                    fname = s[idx+5:].strip().replace(" ", "_")
                    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
            if "upload.wikimedia.org/" in s or re.search(r"\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$", s, re.I):
                return s
            if "/Special:FilePath/" in s:
                return s if "width=" in s else (s + ("&width=800" if "?" in s else "?width=800"))
            return None

        cached_geo = GEOCODE_CACHE.get(city.lower())
        if cached_geo and (now - cached_geo[2] < GEO_TTL):
            lon, lat = cached_geo[0], cached_geo[1]
        else:
            try:
                r = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": city, "format": "json", "limit": 1},
                    headers={"User-Agent": "TripPlannerAI/1.0"}
                )
                r.raise_for_status()
                data = r.json()
                if data:
                    lon = float(data[0]["lon"]); lat = float(data[0]["lat"])
                    GEOCODE_CACHE[city.lower()] = (lon, lat, now)
                else:
                    raise HTTPException(status_code=404, detail=f"City '{city}' not found.")
            except httpx.HTTPError as e:
                raise HTTPException(status_code=500, detail=f"Geocoding error: {e}")

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
            f"nwr[tourism~'museum|attraction'](around:{radius},{lat},{lon});"
            f"nwr[historic~'castle|monument'](around:{radius},{lat},{lon});"
            f"node[leisure=park](around:{radius},{lat},{lon});"
        )
        overpass_query = f"[out:json][timeout:30];({query_filters});out center qt;"

        cache_key = (city.lower(), category, radius)
        cached_places = PLACES_CACHE.get(cache_key)
        if cached_places and (now - cached_places[0] < PLACES_TTL):
            elements = cached_places[1]
        else:
            elements = []
            last_error = None
            for server in [
                "https://overpass-api.de/api/interpreter",
                "https://overpass.kumi.systems/api/interpreter",
                "https://overpass.openstreetmap.ru/api/interpreter",
            ]:
                try:
                    resp = await client.post(server, data=overpass_query, timeout=30)
                    resp.raise_for_status()
                    elements = resp.json().get("elements", [])
                    PLACES_CACHE[cache_key] = (now, elements)
                    break
                except httpx.TimeoutException:
                    last_error = f"Timeout on {server}"; continue
                except httpx.HTTPError as e:
                    last_error = str(e)
                    if "504" in str(e) or "timeout" in str(e).lower():
                        continue
                    raise HTTPException(status_code=500, detail=f"Places API error: {e}")
            if not elements and last_error:
                raise HTTPException(status_code=503, detail=f"All Overpass servers failed. Last error: {last_error}")

        pois = []
        missing_wikidata: set[str] = set()
        for elem in elements:
            elat = elem.get("center", {}).get("lat") or elem.get("lat")
            elon = elem.get("center", {}).get("lon") or elem.get("lon")
            if not elat or not elon:
                continue
            tags = elem.get("tags", {})
            dist_m = math.sqrt((elat - lat)**2 + (elon - lon)**2) * 111000
            kinds = [tags[k] for k in ["tourism", "leisure", "amenity"] if tags.get(k)]
            if tags.get("historic"): kinds.append("historic")
            score = 0
            if tags.get("building") in ["basilica", "cathedral", "castle"]: score += 150
            if tags.get("historic") in ["yes", "castle", "monument"]: score += 100
            if tags.get("wikipedia"): score += 100
            if tags.get("wikidata"): score += 50
            if tags.get("opening_hours"): score += 30
            if tags.get("website"): score += 20
            if tags.get("phone") or tags.get("contact:phone"): score += 15
            if tags.get("email") or tags.get("contact:email"): score += 10
            if tags.get("fee"): score += 10
            if tags.get("operator"): score += 5
            if dist_m < 1000: score += 40
            elif dist_m < 3000: score += 20
            elif dist_m < 5000: score += 10
            name_orig = tags.get("name", "Unnamed")
            # Generic translation handling for en/es/cs
            name_translated = name_orig
            if lang in ("en", "es", "cs"):
                tag_key = f"name:{lang}"
                if tags.get(tag_key):
                    name_translated = tags.get(tag_key)
                elif tags.get("wikidata"):
                    qid = tags.get("wikidata")
                    cached = NAME_CACHE.get(qid)
                    if cached and (now - cached[0] < NAME_TTL) and cached[1].get(lang):
                        name_translated = cached[1][lang]
                    else:
                        missing_wikidata.add(qid)
            poi_obj = {
                "xid": elem.get("id"),
                "name": name_orig,
                "name_translated": name_translated,
                "dist": dist_m,
                "kinds": ", ".join(kinds) if kinds else "place",
                "point": {"lon": elon, "lat": elat},
                "popularity": score,
                "has_wikipedia": bool(tags.get("wikipedia")),
                "has_website": bool(tags.get("website")),
                "has_hours": bool(tags.get("opening_hours")),
                "wikipedia": tags.get("wikipedia"),
                "wikidata": tags.get("wikidata"),
                "image_url": normalize_image_url(tags.get("image")),
            }
            # Preserve previous name_en for backward compatibility if lang is en
            if lang == "en":
                poi_obj["name_en"] = name_translated
            pois.append(poi_obj)

        if lang in ("en", "es", "cs") and missing_wikidata:
            try:
                ids_param = "|".join(sorted(missing_wikidata))
                if ids_param:
                    wd = await client.get(
                        "https://www.wikidata.org/w/api.php",
                        params={"action": "wbgetentities", "ids": ids_param, "format": "json", "languages": lang, "props": "labels"},
                        headers={"User-Agent": "TripPlannerAI/1.0"}, timeout=10
                    )
                    if wd.status_code == 200:
                        ent = wd.json().get("entities", {})
                        stamp = time.time()
                        for p in pois:
                            qid = p.get("wikidata")
                            if qid and qid in ent:
                                lbl = ent[qid].get("labels", {}).get(lang, {})
                                if lbl.get("value"):
                                    p["name_translated"] = lbl["value"]
                                    if lang == "en":
                                        p["name_en"] = lbl["value"]
                                    # Update cache mapping
                                    if qid in NAME_CACHE and (stamp - NAME_CACHE[qid][0] < NAME_TTL):
                                        existing_map = NAME_CACHE[qid][1]
                                    else:
                                        existing_map = {}
                                    existing_map[lang] = lbl["value"]
                                    NAME_CACHE[qid] = (stamp, existing_map)
            except Exception:
                pass

        dedup: list[dict] = []
        for p in pois:
            idx = -1
            for i, ex in enumerate(dedup):
                same = False
                if p.get("wikidata") and ex.get("wikidata") and p["wikidata"] == ex["wikidata"]:
                    same = True
                elif p.get("wikipedia") and ex.get("wikipedia") and p["wikipedia"] == ex["wikipedia"]:
                    same = True
                else:
                    if normalize_name(p.get("name")) == normalize_name(ex.get("name")):
                        a = (p["point"]["lat"], p["point"]["lon"]); b = (ex["point"]["lat"], ex["point"]["lon"])
                        if approx_distance_m(a, b) <= 200: same = True
                if same: idx = i; break
            if idx == -1:
                dedup.append(p)
            else:
                ex = dedup[idx]
                better, other = (p, ex) if p.get("popularity", 0) > ex.get("popularity", 0) else (ex, p)
                if p.get("popularity", 0) == ex.get("popularity", 0) and p.get("dist", 1e9) < ex.get("dist", 1e9):
                    better, other = p, ex
                if not better.get("image_url") and other.get("image_url"): better["image_url"] = other["image_url"]
                if not better.get("wikipedia") and other.get("wikipedia"): better["wikipedia"] = other["wikipedia"]
                better["has_website"] = bool(better.get("has_website") or other.get("has_website"))
                better["has_hours"] = bool(better.get("has_hours") or other.get("has_hours"))
                # Merge translated names
                better["name_translated"] = better.get("name_translated") or other.get("name_translated")
                if lang == "en":
                    better["name_en"] = better.get("name_en") or other.get("name_en")
                dedup[idx] = better

        dedup.sort(key=lambda p: (-p.get("popularity", 0), p.get("dist", float("inf"))))
        dedup = dedup[:limit]

        if with_images:
            for p in dedup:
                if p.get("image_url") or not p.get("wikipedia"): continue
                wp = p["wikipedia"]
                if ":" not in wp: continue
                cached_img = IMG_CACHE.get(wp); stamp = time.time()
                if cached_img and (stamp - cached_img[0] < IMG_TTL):
                    p["image_url"] = cached_img[1]; continue
                try:
                    lang_code, title = wp.split(":", 1)
                    url = f"https://{lang_code}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'))}"
                    r2 = await client.get(url, headers={"User-Agent": "TripPlannerAI/1.0"}, timeout=8)
                    if r2.status_code == 200:
                        j = r2.json(); img = (j.get("thumbnail") or {}).get("source") or (j.get("originalimage") or {}).get("source")
                        if img:
                            p["image_url"] = img; IMG_CACHE[wp] = (stamp, img)
                except Exception:
                    pass
    return {"city": city, "lon": lon, "lat": lat, "places": dedup, "lang": lang}