from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import jobs, search, scraper

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="PriceScout API",
    description="Backend engine for scraping and background tasks",
    version="1.0.0",
)

# SlowAPI Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware Strict Setup
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # We will allow Vercel domains via regex in production, but for now we specify allowed exact
    "https://pricescout.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root rate limit just for sanity check
@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {"status": "ok", "service": "PriceScout API"}

# Include routers
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")
