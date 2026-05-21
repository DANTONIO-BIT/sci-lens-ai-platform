"""
Projects router — research portfolio CRUD + aggregate metrics.
"""
from __future__ import annotations
import asyncio
from fastapi import APIRouter, HTTPException, Header
from supabase import create_client

from app.config import settings
from app.models.schemas import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectResponse,
    ProjectMetrics,
    ProjectDetailResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user = sb.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _compute_metrics(papers_with_analysis: list[dict]) -> ProjectMetrics:
    """Aggregate per-paper analysis into project-level metrics."""
    analyzed = [p for p in papers_with_analysis if p.get("analysis")]
    trl_scores = [p["analysis"]["trl_level"] for p in analyzed if p["analysis"].get("trl_level")]
    tam_values = []
    risk_dist: dict[str, int] = {}
    evidence_dist: dict[str, int] = {}
    methodology_scores = []
    novelty_scores = []
    impact_scores = []
    regulatory_pathways: set[str] = set()

    for p in analyzed:
        a = p["analysis"]
        raw = a.get("raw_json") or {}

        # TAM
        try:
            tam_values.append(float(a.get("tam_estimate", 0) or 0))
        except (ValueError, TypeError):
            pass

        # Risk distribution
        risk = a.get("regulatory_complexity") or raw.get("risk_level", "")
        if risk in ("low", "medium", "high"):
            risk_dist[risk] = risk_dist.get(risk, 0) + 1

        # Evidence quality
        eq = a.get("evidence_quality") or {}
        if isinstance(eq, dict):
            level = eq.get("level", "")
            if level:
                evidence_dist[level] = evidence_dist.get(level, 0) + 1

        # Scores from raw_json
        if raw:
            if raw.get("methodology_score") is not None:
                methodology_scores.append(int(raw["methodology_score"]))
            if raw.get("novelty_score") is not None:
                novelty_scores.append(int(raw["novelty_score"]))
            if raw.get("impact_score") is not None:
                impact_scores.append(int(raw["impact_score"]))

        # Regulatory pathway
        pathway = a.get("regulatory_pathway") or raw.get("regulatory_pathway", "")
        if pathway and pathway.strip():
            regulatory_pathways.add(pathway.strip())

    def _avg(lst: list) -> float:
        return round(sum(lst) / len(lst), 1) if lst else 0.0

    return ProjectMetrics(
        paper_count=len(papers_with_analysis),
        analyzed_count=len(analyzed),
        avg_trl=_avg(trl_scores),
        total_tam_billions=round(sum(tam_values), 2),
        risk_distribution=risk_dist,
        evidence_quality_distribution=evidence_dist,
        regulatory_pathways=sorted(regulatory_pathways),
        avg_methodology_score=_avg(methodology_scores),
        avg_novelty_score=_avg(novelty_scores),
        avg_impact_score=_avg(impact_scores),
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: CreateProjectRequest,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    valid_domains = {
        "pharma_clinical", "pharma_industrial", "biotech",
        "medical_device", "chemicals", "agro_health", "academic_basic",
    }
    if body.domain not in valid_domains:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {body.domain}")

    resp = await asyncio.to_thread(
        lambda: sb.table("research_projects").insert({
            "user_id": user_id,
            "name": body.name,
            "description": body.description,
            "domain": body.domain,
        }).execute()
    )
    d = resp.data[0]
    return ProjectResponse(
        id=d["id"], name=d["name"], description=d["description"],
        domain=d["domain"], status=d["status"], created_at=d["created_at"],
    )


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(authorization: str | None = Header(default=None)):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    projects_resp = await asyncio.to_thread(
        lambda: sb.table("research_projects")
        .select("id, name, description, domain, status, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    projects = projects_resp.data or []

    # Attach paper counts
    if projects:
        project_ids = [p["id"] for p in projects]
        counts_resp = await asyncio.to_thread(
            lambda: sb.table("paper_project_mapping")
            .select("project_id")
            .in_("project_id", project_ids)
            .eq("user_id", user_id)
            .execute()
        )
        count_map: dict[str, int] = {}
        for row in (counts_resp.data or []):
            pid = row["project_id"]
            count_map[pid] = count_map.get(pid, 0) + 1

        return [
            ProjectResponse(
                id=p["id"], name=p["name"], description=p["description"],
                domain=p["domain"], status=p["status"], created_at=p["created_at"],
                paper_count=count_map.get(p["id"], 0),
            )
            for p in projects
        ]

    return []


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    proj_resp = await asyncio.to_thread(
        lambda: sb.table("research_projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not proj_resp.data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = proj_resp.data

    # Paper IDs in this project
    mapping_resp = await asyncio.to_thread(
        lambda: sb.table("paper_project_mapping")
        .select("paper_id")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    paper_ids = [r["paper_id"] for r in (mapping_resp.data or [])]

    papers_with_analysis: list[dict] = []
    if paper_ids:
        papers_resp, analyses_resp = await asyncio.gather(
            asyncio.to_thread(
                lambda: sb.table("papers")
                .select("id, title, authors, status, year, doi, created_at")
                .in_("id", paper_ids)
                .execute()
            ),
            asyncio.to_thread(
                lambda: sb.table("paper_analysis")
                .select("paper_id, trl_level, trl_confidence, tam_estimate, regulatory_complexity, evidence_quality, regulatory_pathway, raw_json")
                .in_("paper_id", paper_ids)
                .execute()
            ),
        )
        analysis_map = {a["paper_id"]: a for a in (analyses_resp.data or [])}
        papers_with_analysis = [
            {**p, "analysis": analysis_map.get(p["id"])}
            for p in (papers_resp.data or [])
        ]

    metrics = _compute_metrics(papers_with_analysis)

    return ProjectDetailResponse(
        project=ProjectResponse(
            id=proj["id"], name=proj["name"], description=proj["description"],
            domain=proj["domain"], status=proj["status"], created_at=proj["created_at"],
            paper_count=len(paper_ids),
        ),
        metrics=metrics,
        papers=papers_with_analysis,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: UpdateProjectRequest,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if body.status is not None:
        if body.status not in ("active", "archived"):
            raise HTTPException(status_code=400, detail="status must be active or archived")
        updates["status"] = body.status
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = "now()"

    resp = await asyncio.to_thread(
        lambda: sb.table("research_projects")
        .update(updates)
        .eq("id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Project not found")
    d = resp.data[0]
    return ProjectResponse(
        id=d["id"], name=d["name"], description=d["description"],
        domain=d["domain"], status=d["status"], created_at=d["created_at"],
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()
    await asyncio.to_thread(
        lambda: sb.table("research_projects")
        .delete()
        .eq("id", project_id)
        .eq("user_id", user_id)
        .execute()
    )


# ---------------------------------------------------------------------------
# Paper ↔ project mapping
# ---------------------------------------------------------------------------

@router.post("/{project_id}/papers/{paper_id}", status_code=201)
async def add_paper_to_project(
    project_id: str,
    paper_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()

    # Verify paper belongs to user
    paper_check = await asyncio.to_thread(
        lambda: sb.table("papers")
        .select("id")
        .eq("id", paper_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not paper_check.data:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Verify project belongs to user
    proj_check = await asyncio.to_thread(
        lambda: sb.table("research_projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not proj_check.data:
        raise HTTPException(status_code=404, detail="Project not found")

    await asyncio.to_thread(
        lambda: sb.table("paper_project_mapping").upsert({
            "project_id": project_id,
            "paper_id": paper_id,
            "user_id": user_id,
        }).execute()
    )
    return {"status": "added"}


@router.delete("/{project_id}/papers/{paper_id}", status_code=204)
async def remove_paper_from_project(
    project_id: str,
    paper_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = _get_user_id(authorization)
    sb = _supabase()
    await asyncio.to_thread(
        lambda: sb.table("paper_project_mapping")
        .delete()
        .eq("project_id", project_id)
        .eq("paper_id", paper_id)
        .eq("user_id", user_id)
        .execute()
    )
