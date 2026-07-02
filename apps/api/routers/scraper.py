import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from auth import get_current_user
from scrapers.registry import get_active_stores, get_store_by_slug
from scrapers.tasks import sync_all_stores, sync_store
from tasks.celery_app import check_celery_available
from tasks.jobs import supabase_writer

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

# --- Schemas and Endpoint for Relevancy Search/Matching (TAREA 3) ---
from typing import List, Optional

from pydantic import BaseModel

from scrapers.matcher import score_match
from scrapers.normalizer import (
    extract_dupe_reference,
    is_dupe_product,
    normalize_product_title,
)


class ProductResult(BaseModel):
    store_slug: str
    store_name: str
    title: str
    title_normalized: str
    price: float
    currency: str
    url: str
    image_url: Optional[str] = None
    available: bool
    is_dupe: bool
    dupe_of: Optional[str] = None
    score: float
    match_detail: dict

class SearchResponse(BaseModel):
    query: str
    query_normalized: str
    exact_results: List[ProductResult]
    related_results: List[ProductResult]
    dupe_results: List[ProductResult]
    discarded_count: int

@router.get("/search", response_model=SearchResponse)
def search_products_match(query: str, user_id: str = Depends(get_current_user)):
    """
    Busca productos en la base de datos de scraping y los categoriza
    según su score de matching de relevancia (TAREA 3).
    """
    query_clean = query.strip()
    if not query_clean:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query_normalized = normalize_product_title(query_clean)

    try:
        # 1. Obtener todas las tiendas registradas para tener un mapeo de slug -> name
        active_stores = get_active_stores()
        store_names = {s.slug: s.name for s in active_stores}

        # 2. Consultar todos los productos en Supabase
        res = supabase_writer.table("products").select("*").execute()
        products = res.data or []

        exact_results = []
        related_results = []
        dupe_results = []
        discarded_count = 0

        for prod in products:
            title = prod.get("title", "")
            score, detail = score_match(query_clean, title, return_detail=True)

            # Obtener is_dupe y dupe_of
            is_dupe = is_dupe_product(title)
            dupe_of = extract_dupe_reference(title)

            store_slug = prod.get("store_slug", "unknown")
            store_name = store_names.get(store_slug, store_slug.capitalize())

            result_item = ProductResult(
                store_slug=store_slug,
                store_name=store_name,
                title=title,
                title_normalized=prod.get("title_normalized", ""),
                price=float(prod.get("price") or 0.0),
                currency=prod.get("currency", "CLP"),
                url=prod.get("url", ""),
                image_url=prod.get("image_url"),
                available=bool(prod.get("available", True)),
                is_dupe=is_dupe,
                dupe_of=dupe_of,
                score=score,
                match_detail=detail
            )

            if is_dupe:
                if score >= 0.25:
                    dupe_results.append(result_item)
                else:
                    discarded_count += 1
            else:
                if score >= 0.80:
                    exact_results.append(result_item)
                elif score >= 0.55:
                    related_results.append(result_item)
                else:
                    discarded_count += 1

        # Ordenar por score desc
        exact_results.sort(key=lambda x: x.score, reverse=True)
        related_results.sort(key=lambda x: x.score, reverse=True)
        dupe_results.sort(key=lambda x: x.score, reverse=True)

        return SearchResponse(
            query=query_clean,
            query_normalized=query_normalized,
            exact_results=exact_results,
            related_results=related_results,
            dupe_results=dupe_results,
            discarded_count=discarded_count
        )

    except Exception as e:
        logger.error(f"Error en /search de router scraper: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

