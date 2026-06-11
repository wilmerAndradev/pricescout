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
