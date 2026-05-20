"""
LLM analysis service — usa OpenRouter como gateway.
Compatible con cualquier modelo que soporte OpenRouter.
Modelos gratuitos recomendados:
  - meta-llama/llama-3.3-70b-instruct:free
  - mistralai/mistral-small-3.1-24b-instruct:free
  - google/gemini-2.0-flash-001 (muy barato, rápido)
"""
from __future__ import annotations
import json
import re
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import AnalysisResult

# OpenRouter es compatible con el SDK de OpenAI — solo cambia la base_url
_client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://scilens.app",   # requerido por OpenRouter
        "X-Title": "SciLens",
    },
)

SYSTEM_PROMPT = """You are a scientific intelligence analyst specializing in technology commercialization and R&D strategy.

Analyze the provided research paper and return ONLY a valid JSON object with this exact structure:

{
  "trl_score": <integer 1-9>,
  "trl_confidence": <integer 0-100>,
  "trl_description": "<one sentence describing the TRL level>",
  "tam_estimate": {
    "value": <float in billions USD>,
    "currency": "USD",
    "breakdown": [
      {"segment": "<market segment name>", "value": <float billions>, "percentage": <integer 0-100>},
      {"segment": "<segment 2>", "value": <float>, "percentage": <integer>},
      {"segment": "<segment 3>", "value": <float>, "percentage": <integer>}
    ]
  },
  "risk_level": "<low|medium|high>",
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {"category": "<technical|market|regulatory|competitive>", "description": "<specific risk>", "severity": "<low|medium|high>"},
    {"category": "<category>", "description": "<risk>", "severity": "<severity>"},
    {"category": "<category>", "description": "<risk>", "severity": "<severity>"}
  ],
  "key_findings": [
    {"title": "<short title>", "description": "<one sentence>", "confidence": <integer 0-100>, "category": "<innovation|application|limitation|opportunity>"},
    {"title": "<title>", "description": "<description>", "confidence": <integer>, "category": "<category>"},
    {"title": "<title>", "description": "<description>", "confidence": <integer>, "category": "<category>"},
    {"title": "<title>", "description": "<description>", "confidence": <integer>, "category": "<category>"}
  ],
  "methodology": "<experimental|observational|computational|theoretical|meta-analysis|review>",
  "methodology_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "novelty_score": <integer 0-100>,
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>", "<tag5>"],
  "extracted_methods": ["<method1>", "<method2>", "<method3>"],
  "extracted_claims": ["<claim1>", "<claim2>", "<claim3>", "<claim4>"],
  "synthesis": "<2-3 sentence paragraph summarizing commercial potential, key findings, and strategic insight>"
}

TRL Reference:
1-3 = Basic/applied research (lab only)
4-5 = Technology validated in lab or relevant environment
6-7 = Technology demonstrated in operational environment
8-9 = System complete, proven in operational environment

Return ONLY the JSON object. No explanations, no markdown, no code blocks."""


def _extract_json(text: str) -> dict:
    """Extrae JSON del output del LLM, tolerando modelos que añaden markdown u otro texto."""
    # Intentar parseo directo
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Buscar bloque ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Buscar primer objeto JSON en el texto
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in LLM output: {text[:200]}")


async def analyze_paper(title: str, abstract: str, full_text: str) -> AnalysisResult:
    """
    Analiza un paper con el LLM configurado en OpenRouter.
    Usa los primeros 10.000 caracteres del texto para no superar el context window.
    """
    text_excerpt = full_text[:10_000]

    user_message = f"""PAPER TITLE: {title}

ABSTRACT:
{abstract}

PAPER CONTENT (excerpt):
{text_excerpt}

Analyze this paper and return the JSON assessment."""

    # Intentar con JSON mode si el modelo lo soporta, con fallback sin él
    for use_json_mode in (True, False):
        try:
            kwargs: dict = dict(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_tokens=2000,
            )
            if use_json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await _client.chat.completions.create(**kwargs)
            raw = response.choices[0].message.content or "{}"
            data = _extract_json(raw)
            return AnalysisResult(**data)

        except Exception as e:
            if not use_json_mode:
                raise
            # JSON mode no soportado por este modelo → reintenta sin él
            last_error = e
            continue

    raise last_error  # type: ignore
