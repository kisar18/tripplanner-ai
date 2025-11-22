"""Image enrichment for places using Wikipedia and Wikidata APIs."""
import httpx
import time
import urllib.parse

# In-memory cache for images
IMG_CACHE: dict[str, tuple[float, str]] = {}  # key -> (timestamp, image_url)
IMG_TTL = 24 * 60 * 60  # 24 hours

USER_AGENT = "Mozilla/5.0 (compatible; TripPlannerAI/1.0; +https://github.com/kisar18/tripplanner-ai)"


async def enrich_places_with_images(places: list[dict], client: httpx.AsyncClient) -> None:
    """Enrich places with images from Wikipedia and Wikidata.
    
    Args:
        places: List of place dictionaries to enrich (modified in-place)
        client: httpx.AsyncClient instance for making requests
    """
    stamp = time.time()
    
    # Pass 1: Wikipedia REST summary thumbnails
    for p in places:
        wp = p.get("wikipedia")
        if wp and ":" in wp:
            cache_key = "wikipedia:" + wp
            cached = IMG_CACHE.get(cache_key)
            if cached and (stamp - cached[0]) < IMG_TTL:
                p["image_url"] = cached[1]
                continue
            
            try:
                lang_code, title = wp.split(":", 1)
                url = f"https://{lang_code}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'))}"
                r = await client.get(
                    url,
                    headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                    timeout=8
                )
                if r.status_code == 200:
                    j = r.json()
                    img = (j.get("thumbnail") or {}).get("source") or (j.get("originalimage") or {}).get("source")
                    if img:
                        p["image_url"] = img
                        IMG_CACHE[cache_key] = (stamp, img)
            except Exception:
                pass
    
    # Pass 2: Wikidata P18 (Commons media) batch fetch
    missing_img_qids = [p.get("wikidata") for p in places if p.get("wikidata") and not p.get("image_url")]
    if missing_img_qids:
        uniq_qids = list(dict.fromkeys(missing_img_qids))[:50]
        try:
            wd_img = await client.get(
                "https://www.wikidata.org/w/api.php",
                params={
                    "action": "wbgetentities",
                    "ids": "|".join(uniq_qids),
                    "format": "json",
                    "props": "claims"
                },
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                timeout=12
            )
            if wd_img.status_code == 200:
                ents = wd_img.json().get("entities", {})
                for p in places:
                    qid = p.get("wikidata")
                    if not qid or p.get("image_url") or qid not in ents:
                        continue
                    claims = ents[qid].get("claims", {})
                    p18 = claims.get("P18")
                    if p18 and isinstance(p18, list):
                        for stmt in p18:
                            val = stmt.get("mainsnak", {}).get("datavalue", {}).get("value")
                            if isinstance(val, str) and val:
                                fname = val.strip().replace(" ", "_")
                                img_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
                                p["image_url"] = img_url
                                IMG_CACHE["wikidata:" + qid] = (stamp, img_url)
                                break
        except Exception:
            pass
    
    # Pass 3: Wikipedia pageimages API fallback
    still_missing = [p for p in places if p.get("wikipedia") and not p.get("image_url")]
    for p in still_missing:
        wp = p.get("wikipedia")
        if not wp or ":" not in wp:
            continue
        lang_code, title = wp.split(":", 1)
        try:
            rpi = await client.get(
                f"https://{lang_code}.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "titles": title,
                    "prop": "pageimages",
                    "piprop": "thumbnail|original",
                    "pithumbsize": 500,
                    "format": "json"
                },
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                timeout=8
            )
            if rpi.status_code == 200:
                pages = rpi.json().get("query", {}).get("pages", {})
                for _, page in pages.items():
                    img = (page.get("thumbnail") or {}).get("source") or (page.get("original") or {}).get("source")
                    if img:
                        for place in places:
                            if place.get("wikipedia") == wp and not place.get("image_url"):
                                place["image_url"] = img
                        break
        except Exception:
            pass


def normalize_image_url(raw: str | None) -> str | None:
    """Normalize image URLs from various formats to usable URLs."""
    if not raw:
        return None
    s = raw.strip()
    
    # File: prefix (Wikimedia Commons filename)
    if s.lower().startswith("file:"):
        fname = s.split(":", 1)[1].strip().replace(" ", "_")
        return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fname)}?width=800"
    
    # Filter out Category: references
    if s.lower().startswith("category:"):
        return None
    
    # Direct URL
    if s.startswith("http://") or s.startswith("https://"):
        return s
    
    # Special:FilePath format
    if "Special:FilePath" in s or "special:filepath" in s.lower():
        return s
    
    # Bare filename - treat as Wikimedia Commons
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(s.replace(' ', '_'))}?width=800"
