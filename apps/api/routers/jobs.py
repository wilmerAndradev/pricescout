from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import List
from auth import get_current_user, execute_with_retry
from tasks.jobs import scrape_url_task, supabase_writer
from tasks.celery_app import check_celery_available
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

class ScrapeRequest(BaseModel):
    urls: List[HttpUrl]

@router.post("/scrape", status_code=202)
def queue_scrape_jobs(request: ScrapeRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    if not request.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")
        
    try:
        # Create a comparison_job record
        res = execute_with_retry(supabase_writer.table("comparison_jobs").insert({
            "user_id": user_id,
            "total_urls": len(request.urls),
            "status": "pending"
        }))
        
        comparison_job_id = res.data[0]["id"]
        
        job_ids = []
        celery_ok = check_celery_available()
        
        for url_obj in request.urls:
            url = str(url_obj)
            if celery_ok:
                task = scrape_url_task.apply_async(args=[url, user_id, comparison_job_id], retry=False)
                job_ids.append(task.id)
            else:
                background_tasks.add_task(scrape_url_task.run, url, user_id, comparison_job_id)
                job_ids.append(f"local_{url}")
            
        return {
            "message": f"Queued {len(job_ids)} scrape jobs",
            "job_ids": [comparison_job_id] # Return the comparison job ID for the UI
        }
    except Exception as e:
        logger.error(f"Failed to create comparison job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{job_id}")
def get_job_status(job_id: str, user_id: str = Depends(get_current_user)):
    """
    Check the status of a comparison job by querying the database.
    """
    try:
        # Check comparison_jobs
        job_res = execute_with_retry(supabase_writer.table("comparison_jobs").select("*").eq("id", job_id))
        if not job_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
            
        job = job_res.data[0]
        
        # Check completed price_results
        results_res = execute_with_retry(supabase_writer.table("price_results").select("id", count="exact").eq("comparison_job_id", job_id))
        completed_count = results_res.count if results_res.count is not None else 0
        
        if completed_count >= job["total_urls"]:
            # Optionally update status to completed
            execute_with_retry(supabase_writer.table("comparison_jobs").update({"status": "completed"}).eq("id", job_id))
            return {
                "job_id": job_id,
                "status": "SUCCESS"
            }
        else:
            return {
                "job_id": job_id,
                "status": "PENDING",
                "progress": f"{completed_count}/{job['total_urls']}"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking job status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
