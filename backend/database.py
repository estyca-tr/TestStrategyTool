from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test_strategy.db")

# Railway uses postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs special connect_args, PostgreSQL doesn't
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # Import ALL models to ensure tables are created
    from models import (
        Project, Document, TestStrategy, TestPlan, 
        Comment, Participant, BreakdownCategory, BreakdownItem,
        User, Share
    )
    Base.metadata.create_all(bind=engine)
    
    # Run migrations for new columns
    run_migrations()


def run_migrations():
    """Add missing columns to existing tables"""
    from sqlalchemy import text
    
    migrations = [
        # Add eta and duration_days to breakdown_items
        ("breakdown_items", "eta", "ALTER TABLE breakdown_items ADD COLUMN eta TIMESTAMP NULL"),
        ("breakdown_items", "duration_days", "ALTER TABLE breakdown_items ADD COLUMN duration_days INTEGER NULL"),
        # Add eta and duration_days to breakdown_categories
        ("breakdown_categories", "eta", "ALTER TABLE breakdown_categories ADD COLUMN eta TIMESTAMP NULL"),
        ("breakdown_categories", "duration_days", "ALTER TABLE breakdown_categories ADD COLUMN duration_days INTEGER NULL"),
    ]
    
    with engine.connect() as conn:
        for table, column, sql in migrations:
            try:
                # Check if column exists (PostgreSQL)
                check_sql = text(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = '{table}' AND column_name = '{column}'
                """)
                result = conn.execute(check_sql)
                if result.fetchone() is None:
                    print(f"Adding column {column} to {table}...")
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"Column {column} added successfully!")
            except Exception as e:
                print(f"Migration for {table}.{column} skipped or failed: {e}")
