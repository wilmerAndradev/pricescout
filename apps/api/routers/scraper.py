from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from auth import get_current_user
from tasks.jobs import supabase_writer
from scrapers.registry import get_store_by_slug, get_active_stores
from scrapers.tasks import sync_store, sync_all_stores
from tasks.celery_app import check_celery_available
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scraper", tags=["scraper"])

@router.post("/sync/{store_slug}", status_code=202)
def trigger_store_sync(store_slug: str, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    """
    Inicia la sincronización manual en background de una sola tienda (Admin only).
    """
    store = get_store_by_slug(store_slug)
    if not store:
        raise HTTPException(status_code=404, detail=f"Tienda '{store_slug}' no encontrada en el registro")
        
    if not store.active:
        raise HTTPException(status_code=400, detail=f"La tienda '{store_slug}' está inactiva")

    try:
        if check_celery_available():
            task = sync_store.apply_async(args=[store_slug], retry=False)
            task_id = task.id
        else:
            background_tasks.add_task(sync_store.run, store_slug)
            task_id = f"local_{store_slug}"
            
        return {
            "message": f"Sincronización iniciada para la tienda: {store.name}",
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"Error al encolar sync_store task para {store_slug}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/sync-all", status_code=202)
def trigger_all_stores_sync(background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    """
    Inicia la sincronización de todas las tiendas activas en paralelo (Admin only).
    """
    try:
        if check_celery_available():
            task = sync_all_stores.apply_async(retry=False)
            task_id = task.id
        else:
            background_tasks.add_task(sync_all_stores.run)
            task_id = "local_all_stores"
            
        return {
            "message": "Sincronización iniciada para todas las tiendas activas",
            "task_id": task_id
        }
    except Exception as e:
        logger.error(f"Error al encolar sync_all_stores task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/status")
def get_scraper_status(user_id: str = Depends(get_current_user)):
    """
    Retorna el estado del último sync de cada tienda registrada.
    """
    try:
        # Consultar todas las tiendas en Supabase
        res = supabase_writer.table("stores").select("*").execute()
        stores_in_db = {s["slug"]: s for s in res.data} if res.data else {}
        
        # Cruzar con las registradas localmente en registry.py
        active_stores = get_active_stores()
        status_list = []
        
        for store in active_stores:
            db_data = stores_in_db.get(store.slug, {})
            status_list.append({
                "slug": store.slug,
                "name": store.name,
                "url": store.url,
                "sync_method": store.sync_method,
                "active": store.active,
                "last_sync_at": db_data.get("last_sync_at"),
                "last_sync_products_count": db_data.get("last_sync_products_count", 0),
                "synced": "last_sync_at" in db_data and db_data["last_sync_at"] is not None
            })
            
        return status_list
    except Exception as e:
        logger.error(f"Error al obtener estado de los scrapers: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
