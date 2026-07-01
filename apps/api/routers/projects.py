"""
routers/projects.py — FastAPI Projects & Monitoring Management Endpoints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provides endpoints for creating projects and retrieving historical price series.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from auth import get_current_user, execute_with_retry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class ProjectRequest(BaseModel):
    name: str
    search_query: str
    environment_id: Optional[str] = None
    refresh_frequency_hours: Optional[int] = 24


# ─── Endpoints: Projects & History ───────────────────────────────────────────

@router.post("", status_code=201)
def create_project(request: ProjectRequest, user_id: str = Depends(get_current_user)):
    """
    Creates a new monitoring project for an authenticated user,
    validating the user's plan limits (max project count and minimum refresh frequency).
    """
    from core.plans import get_user_plan_and_limits, supabase_admin

    plan_limits = get_user_plan_and_limits(user_id)

    # 1. Enforce projects limit
    max_projects = plan_limits["projects_limit"]
    if max_projects == 0:
        raise HTTPException(
            status_code=403,
            detail={
                "detail": "El plan Gratis no permite crear proyectos de monitoreo. Actualiza tu plan.",
                "code": "PLAN_RESTRICTION"
            }
        )

    # Query current active projects count
    try:
        current_res = execute_with_retry(
            supabase_admin.table("projects")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_archived", False)
        )
        current_count = current_res.count or 0
        if max_projects != -1 and current_count >= max_projects:
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": f"Límite de proyectos de monitoreo alcanzado ({current_count}/{max_projects}) para tu plan {plan_limits['name']}.",
                    "code": "LIMIT_EXCEEDED"
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking project limits: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "detail": "Error al validar límites de proyectos",
                "code": "DATABASE_ERROR"
            }
        )

    # 2. Enforce minimum refresh frequency
    # Gratis -> N/A
    # Starter -> 24h
    # Pro -> 6h
    # Business -> 2h
    refresh_min = 24
    if plan_limits["name"].lower() == "pro":
        refresh_min = 6
    elif plan_limits["name"].lower() == "business":
        refresh_min = 2

    req_refresh = request.refresh_frequency_hours or 24
    if req_refresh < refresh_min:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"La frecuencia de refresco mínima para tu plan {plan_limits['name']} es de {refresh_min} horas.",
                "code": "PLAN_RESTRICTION"
            }
        )

    # 3. Create the project in Supabase
    try:
        project_payload = {
            "user_id": user_id,
            "name": request.name.strip(),
            "search_query": request.search_query.strip(),
            "environment_id": request.environment_id,
            "refresh_frequency_hours": req_refresh,
            "is_archived": False
        }
        res = execute_with_retry(supabase_admin.table("projects").insert(project_payload))
        if not res.data:
            raise HTTPException(
                status_code=500,
                detail={
                    "detail": "No se pudo crear el proyecto en la base de datos",
                    "code": "DATABASE_ERROR"
                }
            )

        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "detail": "Internal server error",
                "code": "INTERNAL_ERROR"
            }
        )


@router.get("/{project_id}/history")
def get_project_history(project_id: str, user_id: str = Depends(get_current_user)):
    """
    Returns the time-series price history for a given project,
    verifying ownership of the project first.
    """
    from core.plans import supabase_admin

    # 1. Verify project ownership
    try:
        proj_res = execute_with_retry(
            supabase_admin.table("projects")
            .select("user_id")
            .eq("id", project_id)
        )
        if not proj_res.data:
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": "Proyecto no encontrado",
                    "code": "PROJECT_NOT_FOUND"
                }
            )

        if proj_res.data[0].get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": "No tienes acceso a este proyecto",
                    "code": "PLAN_RESTRICTION"
                }
            )

        # 2. Fetch price history
        history_res = execute_with_retry(
            supabase_admin.table("price_history")
            .select("*")
            .eq("project_id", project_id)
            .order("extracted_at", desc=False)
        )
        history = history_res.data or []

        return {
            "project_id": project_id,
            "history": history
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project history: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "detail": "Error interno al recuperar el historial de precios",
                "code": "INTERNAL_ERROR"
            }
        )


@router.post("/{project_id}/refresh")
def refresh_project(project_id: str, user_id: str = Depends(get_current_user)):
    """
    Manually refreshes a monitoring project by executing a query matching
    on the current catalog and saving results directly to price_history.
    Implements a strict 1x/hour manual update limit per project.
    """
    import datetime
    from core.plans import supabase_admin, get_user_plan_and_limits
    from scrapers.matcher import score_match
    from scrapers.normalizer import is_dupe_product
    from search.query_builder import build_search_query
    from tasks.jobs import parse_product_details

    SLUG_TO_DOMAIN_AND_NAME = {
        "cosmetic": ("cosmetic.cl", "Cosmetic"),
        "comprarenchile": ("comprarenchile.cl", "ComprarenChile"),
        "elite-perfumes": ("eliteperfumes.cl", "Elite Perfumes"),
        "lodoro": ("lodoro.cl", "Lodoro"),
        "multimarcas": ("multimarcasperfumes.cl", "MultiMarcas Perfumes"),
        "mundo-aromas": ("mundoaromas.cl", "Mundo Aromas"),
        "perfumisimo": ("perfumisimo.cl", "Perfumisimo"),
        "productos-de-lujo": ("productosdelujo.cl", "Productos de Lujo"),
        "silk-perfumes": ("silkperfumes.cl", "Silk Perfumes"),
        "yauras": ("yauras.cl", "Yauras"),
        "alarab": ("alarab.cl", "Alarab"),
        "alisha": ("alishaperfumes.cl", "Alisha Perfumes"),
        "paris-perfumes": ("parisperfumes.cl", "ParisPerfumes"),
        "sairam": ("sairam.cl", "Sairam"),
        "joy-perfumes": ("joyperfumes.cl", "JoyPerfumes")
    }

    try:
        # 1. Fetch project details and verify ownership
        proj_res = execute_with_retry(
            supabase_admin.table("projects")
            .select("*")
            .eq("id", project_id)
        )
        if not proj_res.data:
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": "Proyecto no encontrado",
                    "code": "PROJECT_NOT_FOUND"
                }
            )

        project = proj_res.data[0]
        if project.get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": "No tienes acceso a este proyecto",
                    "code": "PLAN_RESTRICTION"
                }
            )

        # 2. Check 1x/hour rate limiting
        last_refreshed = project.get("last_refreshed_at")
        if last_refreshed:
            try:
                # Parse timestamp
                last_dt = datetime.datetime.fromisoformat(last_refreshed.replace("Z", "+00:00"))
                now_dt = datetime.datetime.now(datetime.timezone.utc)
                diff = now_dt - last_dt
                if diff.total_seconds() < 3600:
                    remaining_mins = int((3600 - diff.total_seconds()) / 60)
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "detail": f"Solo puedes actualizar manualmente este proyecto una vez por hora. Intenta de nuevo en {remaining_mins} minutos.",
                            "code": "RATE_LIMIT_EXCEEDED"
                        }
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error parsing last_refreshed_at: {e}")

        # 3. Retrieve user plan limits
        plan_limits = get_user_plan_and_limits(user_id)
        max_stores = plan_limits["stores_per_search"]

        # Fetch environment details if exists
        allowed_domains = None
        environment_id = project.get("environment_id")
        if environment_id:
            env_res = execute_with_retry(
                supabase_admin.table("environments")
                .select("store_domains, custom_domains")
                .eq("id", environment_id)
            )
            if env_res.data:
                store_domains = env_res.data[0].get("store_domains") or []
                custom_domains = env_res.data[0].get("custom_domains") or []
                allowed_domains = {d.strip().lower() for d in (store_domains + custom_domains) if d.strip()}

        # 4. Search products in DB
        query = project["search_query"]
        query_data = build_search_query(query)
        
        products = []
        try:
            rpc_res = execute_with_retry(supabase_admin.rpc("search_products", {
                "query_text":    query_data["query_text"],
                "result_limit":  60,
                "result_offset": 0,
                "filter_store":  None,
            }))
            products = rpc_res.data or []
        except Exception as fts_err:
            logger.warning(f"Refresh FTS RPC failed: {fts_err}")
            # Fallback
            from scrapers.normalizer import normalize_product_title, extract_volume_ml
            normalized_query = normalize_product_title(query)
            query_volume = extract_volume_ml(query)
            terms = [t for t in normalized_query.split() if len(t) > 1]
            if terms:
                q_builder = supabase_admin.table("products").select("*")
                for term in terms:
                    if query_volume and (term == "ml" or (term.isdigit() and int(term) == query_volume)):
                        continue
                    q_builder = q_builder.ilike("title_normalized", f"%{term}%")
                fallback_res = q_builder.limit(60).execute()
                products = fallback_res.data or []

        # 5. Deduplicate and score matches
        unique_products = {}
        for prod in products:
            slug = prod.get("store_slug")
            url = prod.get("url")
            if not slug or not url:
                continue
            
            key = (slug, url)
            existing = unique_products.get(key)
            if not existing:
                unique_products[key] = prod
            else:
                existing_avail = existing.get("available", True)
                current_avail = prod.get("available", True)
                if current_avail and not existing_avail:
                    unique_products[key] = prod
                elif current_avail == existing_avail:
                    existing_seen = existing.get("last_seen_at") or ""
                    current_seen = prod.get("last_seen_at") or ""
                    if current_seen > existing_seen:
                        unique_products[key] = prod
                        
        products = list(unique_products.values())

        # Select the CHEAPEST product per store domain
        cheapest_per_store = {}
        inserted_store_domains = set()

        for prod in products:
            raw_title = prod.get("title") or ""
            score = score_match(query, raw_title)
            is_dupe = is_dupe_product(raw_title)
            
            if is_dupe:
                if score < 0.25:
                    continue
            else:
                if score < 0.80:
                    continue
                
            slug = prod.get("store_slug")
            domain_name = SLUG_TO_DOMAIN_AND_NAME.get(slug)
            if not domain_name:
                continue
            domain, name = domain_name
            domain_lower = domain.strip().lower()
            
            if allowed_domains is not None and domain_lower not in allowed_domains:
                continue

            try:
                price_clp = int(float(prod.get("price", 0)))
            except Exception:
                price_clp = 0

            if price_clp <= 0:
                continue

            # Check if this is the cheapest for this store so far
            current_cheapest = cheapest_per_store.get(domain_lower)
            if not current_cheapest or price_clp < current_cheapest["price_clp"]:
                # Normalise compare_at_price
                raw_data = prod.get("raw_data") or {}
                orig_price = raw_data.get("compare_at_price") or raw_data.get("price_original") or raw_data.get("original_price")
                orig_price_int = None
                try:
                    if orig_price:
                        orig_val = float(orig_price)
                        if orig_val > price_clp * 10:
                            orig_val = orig_val / 100.0
                        if orig_val > price_clp:
                            orig_price_int = int(orig_val)
                except Exception:
                    pass

                cheapest_per_store[domain_lower] = {
                    "project_id": project_id,
                    "store_domain": domain_lower,
                    "price_clp": price_clp,
                    "original_price_clp": orig_price_int,
                    "in_stock": prod.get("available", True),
                    "image_url": prod.get("image_url"),
                    "extracted_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }

        # 6. Save cheapest results per store to price_history
        history_records = []
        for domain_lower, record in cheapest_per_store.items():
            if max_stores != -1 and len(inserted_store_domains) >= max_stores:
                continue
            inserted_store_domains.add(domain_lower)
            history_records.append(record)

        if history_records:
            execute_with_retry(supabase_admin.table("price_history").insert(history_records))

        # 7. Update last_refreshed_at in projects table
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        execute_with_retry(
            supabase_admin.table("projects")
            .update({"last_refreshed_at": now_str})
            .eq("id", project_id)
        )

        # 8. Return updated history
        updated_history_res = execute_with_retry(
            supabase_admin.table("price_history")
            .select("*")
            .eq("project_id", project_id)
            .order("extracted_at", desc=False)
        )
        return {
            "project_id": project_id,
            "last_refreshed_at": now_str,
            "history": updated_history_res.data or []
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing project: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "detail": "Error interno al refrescar los precios del proyecto",
                "code": "INTERNAL_ERROR"
            }
        )
