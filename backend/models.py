from sqlalchemy import Table, Column, Integer, String, JSON
from db import metadata

trips = Table(
    "trips",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("city", String),
    Column("days", Integer),
    Column("description", String),
    # JSON-encoded array of POI xids (stored as TEXT for SQLite compatibility)
    Column("places_to_visit", String, nullable=True),
)