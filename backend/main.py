from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import database, engine, metadata
from models import trips
from contextlib import asynccontextmanager

# Definujeme vstupní model
class TripIn(BaseModel):
    city: str
    days: int
    itinerary: dict

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