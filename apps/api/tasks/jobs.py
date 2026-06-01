import logging
import os
from tasks.celery_app import app
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# ─── Supabase writer (service role bypasses RLS) ─────────────────────────────
_supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
_anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
_write_key = (
    _service_key
    if _service_key and _service_key != "your-service-role-key-here"
    else _anon_key
)
supabase_writer: Client = create_client(_supabase_url, _write_key)


@app.task(bind=True, rate_limit="1/s", max_retries=3)
def scrape_url_task(self, url: str, user_id: str = None, comparison_job_id: str = None):
    """
    Celery task — Hybrid Scraping Pipeline (SRS v2.0).
    Routes URL through scraping_router which selects:
      - Motor A (Deterministic Parser) for known stores
      - Motor B (LLM Universal) for unknown domains
    Saves result to Supabase price_results table.
    """
    job_id = self.request.id
    logger.info(f"Starting scrape job {job_id} for URL: {url} by user {user_id}")

    try:
        from tasks.scraping_router import route_and_extract

        data = route_and_extract(url, supabase_client=supabase_writer)

        logger.info(
            f"Extracted: {data['name']} | ${data['price']} "
            f"| method={data.get('extraction_method')} "
            f"| confidence={data.get('confidence_score')}"
        )

        # Save to Supabase price_results
        if user_id and data["price"] >= 0:
            result_payload = {
                "job_id": job_id,
                "user_id": user_id,
                "comparison_job_id": comparison_job_id,
                "product_name": data["name"],
                "price": data["price"],
                "price_original": data.get("price_original"),
                "image_url": data.get("image_url", ""),
                "source_url": url,
                "store_name": data["source"],
                "in_stock": data.get("in_stock", True),
                "extraction_method": data.get("extraction_method", "parser"),
                "confidence_score": data.get("confidence_score"),
            }
            supabase_writer.table("price_results").insert(result_payload).execute()
            logger.info("Saved result to database successfully.")

        return {"status": "success", "url": url, "data": data}

    except Exception as exc:
        logger.error(f"Failed to scrape {url}: {str(exc)}")
        if self.request.retries >= self.max_retries:
            # Insert failed record so the frontend knows this URL is done
            if user_id and comparison_job_id:
                try:
                    supabase_writer.table("price_results").insert({
                        "job_id": job_id,
                        "user_id": user_id,
                        "comparison_job_id": comparison_job_id,
                        "product_name": "Error al extraer",
                        "price": 0,
                        "source_url": url,
                        "store_name": "Error",
                        "in_stock": False,
                        "extraction_method": "llm",
                        "confidence_score": "low"
                    }).execute()
                except Exception as db_exc:
                    logger.error(f"Failed to insert error record: {db_exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
