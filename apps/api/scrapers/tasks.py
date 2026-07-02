import os
import sys

# Cargar variables de entorno desde apps/web/.env.local si no están definidas
if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "web", ".env.local"))
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    v = v.strip().strip("'").strip('"')
                    os.environ[k.strip()] = v

import asyncio
import logging

from scrapers.registry import SyncMethod, get_active_stores, get_store_by_slug
from tasks.celery_app import app
from tasks.jobs import supabase_writer

logger = logging.getLogger(__name__)

def run_async(coro):
    """Ejecuta una corrutina asíncrona de manera síncrona en el hilo actual."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

async def _sync_store_async(store_slug: str) -> dict:
    """Implementación asíncrona de la sincronización de una tienda."""
    store_config = get_store_by_slug(store_slug)
    if not store_config:
        raise ValueError(f"Tienda no encontrada en el registro: {store_slug}")

    if not store_config.active:
        logger.info(f"Tienda {store_slug} está inactiva, ignorando sincronización.")
        return {"status": "inactive", "store": store_slug}

    # Instanciar el scraper correcto según la estrategia
    if store_config.sync_method == SyncMethod.SHOPIFY_JSON:
        from scrapers.strategies.shopify_json import ShopifyJsonScraper
        scraper = ShopifyJsonScraper(
            store_slug=store_config.slug,
            store_name=store_config.name,
            store_url=store_config.url,
            catalog_url=store_config.catalog_url
        )
    elif store_config.sync_method == SyncMethod.SHOPIFY_JS:
        from scrapers.strategies.shopify_js import ShopifyJsScraper
        scraper = ShopifyJsScraper(
            store_slug=store_config.slug,
            store_name=store_config.name,
            store_url=store_config.url,
            catalog_url=store_config.catalog_url
        )
    elif store_config.sync_method == SyncMethod.HTML_PARSER:
        from scrapers.strategies.html_parser import HtmlParserScraper
        scraper = HtmlParserScraper(
            store_slug=store_config.slug,
            store_name=store_config.name,
            store_url=store_config.url,
            catalog_url=store_config.catalog_url
        )
    else:
        raise ValueError(f"Estrategia de sync desconocida: {store_config.sync_method}")

    # Ejecutar el scraper con el cliente de Supabase
    result = await scraper.run(db_client=supabase_writer)

    return {
        "status": "success" if result.success else "failed",
        "store": store_slug,
        "total_scraped": result.total_scraped,
        "added": result.added,
        "updated": result.updated,
        "errors": result.errors
    }


@app.task(bind=True, max_retries=3)
def sync_store(self, store_slug: str) -> dict:
    """Tarea Celery para sincronizar el catálogo de una sola tienda."""
    logger.info(f"Iniciando Celery task sync_store para: {store_slug}")
    try:
        return run_async(_sync_store_async(store_slug))
    except Exception as exc:
        logger.error(f"Error en Celery task sync_store para {store_slug}: {exc}")
        is_celery = self and hasattr(self, "retry")
        if is_celery:
            raise self.retry(exc=exc, countdown=10)
        else:
            raise exc

@app.task
def sync_all_stores() -> dict:
    """Tarea Celery para sincronizar todas las tiendas activas en paralelo (or local fallback)."""
    active_stores = get_active_stores()
    logger.info(f"Encolando tareas de sincronización en paralelo para {len(active_stores)} tiendas.")

    from tasks.celery_app import check_celery_available
    celery_ok = check_celery_available()

    for store in active_stores:
        if celery_ok:
            sync_store.delay(store.slug)
        else:
            logger.info(f"Running local sync for {store.slug} sequentially (Celery not available)...")
            try:
                run_async(_sync_store_async(store.slug))
            except Exception as e:
                logger.error(f"Failed to sync {store.slug} in local mode: {e}")

    return {
        "message": f"Queued/executed sync tasks for {len(active_stores)} stores",
        "stores": [s.slug for s in active_stores]
    }


# Punto de entrada para ejecución manual por CLI
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m scrapers.tasks [sync_store <store_slug> | sync_all_stores]")
        sys.exit(1)

    cmd = sys.argv[1]
    # Configurar logging a consola para la ejecución directa
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    if cmd == "sync_store":
        if len(sys.argv) < 3:
            print("Error: Se requiere el slug de la tienda.")
            sys.exit(1)
        slug = sys.argv[2]
        print(f"Ejecutando sincronización manual para la tienda: {slug}")
        res = run_async(_sync_store_async(slug))
        print("\nResultado:")
        print(res)
    elif cmd == "sync_all_stores":
        print("Ejecutando sincronización manual para todas las tiendas activas...")
        active = get_active_stores()
        print(f"Tiendas activas a procesar: {[s.slug for s in active]}")
        for store in active:
            print(f"\n--- Sincronizando {store.slug} ({store.sync_method}) ---")
            try:
                res = run_async(_sync_store_async(store.slug))
                print(f"Resultado {store.slug}:", res)
            except Exception as e:
                print(f"Error al sincronizar {store.slug}: {e}")
    else:
        print(f"Comando desconocido: {cmd}")
        sys.exit(1)
