from databases import Database
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "sqlite+aiosqlite:///./tripplanner.db"

# Asynchronní engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Metadata pro tabulky
metadata = MetaData()

# Databases instance (asynchronní API)
database = Database(DATABASE_URL)