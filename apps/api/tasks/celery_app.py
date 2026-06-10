import os
from celery import Celery

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "pricescout_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["tasks.jobs", "scrapers.tasks"]
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Configure strict rate limits per worker as requested by SRS
    worker_prefetch_multiplier=1,
)

def check_celery_available() -> bool:
    """Checks if Redis broker for Celery is connected/reachable."""
    try:
        with app.connection(connect_timeout=1.0) as conn:
            conn.connect()
        return True
    except Exception:
        return False

