from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import init_db
from routers import projects, documents, strategies, test_plans, comments
from routers import participants, breakdown, progress
from routers import auth, shares


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create uploads directory
    os.makedirs("uploads", exist_ok=True)
    # Initialize database
    init_db()
    yield


app = FastAPI(
    title="Test Strategy Tool API",
    description="API for managing test strategy documents, HLD/PRD uploads, and test plans",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(strategies.router, prefix="/api/strategies", tags=["Test Strategies"])
app.include_router(test_plans.router, prefix="/api/test-plans", tags=["Test Plans"])
app.include_router(comments.router, prefix="/api/comments", tags=["Comments"])

# Cross-Team routers
app.include_router(participants.router, prefix="/api", tags=["Participants"])
app.include_router(breakdown.router, prefix="/api", tags=["Breakdown"])
app.include_router(progress.router, prefix="/api", tags=["Progress"])

# Authentication & Sharing
app.include_router(auth.router)
app.include_router(shares.router)


@app.get("/")
async def root():
    return {
        "message": "Test Strategy Tool API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

