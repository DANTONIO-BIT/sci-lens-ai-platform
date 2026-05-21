"""
PDF parsing service using PyMuPDF.
Extracts text, metadata, detects sections, and builds priority context for LLM.
"""
from __future__ import annotations
import re
import fitz  # PyMuPDF
from app.models.schemas import PaperMetadata
from app.config import settings


SECTION_PATTERNS = {
    "abstract": re.compile(r"^\s*[Aa]bstract\s*$", re.MULTILINE),
    "introduction": re.compile(r"^\s*(?:1\.?\s*)?(?:Introduction|Background)\s*$", re.MULTILINE),
    "methods": re.compile(r"^\s*(?:2\.?\s*)?(?:Methods?|Materials?\s*(?:and|&)\s*Methods?|Methodology|Experimental)\s*$", re.MULTILINE),
    "results": re.compile(r"^\s*(?:3\.?\s*)?(?:Results?|Findings?|Outcomes?)\s*$", re.MULTILINE),
    "discussion": re.compile(r"^\s*(?:4\.?\s*)?(?:Discussion|Interpretation)\s*$", re.MULTILINE),
    "conclusion": re.compile(r"^\s*(?:5\.?\s*)?(?:Conclusion|Conclusions?|Summary)\s*$", re.MULTILINE),
    "references": re.compile(r"^\s*(?:References|Bibliography|Literature\s+Cited)\s*$", re.MULTILINE),
}

LLM_SECTION_PRIORITY = ["abstract", "methods", "results", "conclusion", "discussion"]


def _clean_text(text: str) -> str:
    """Remove excessive whitespace and fix common PDF extraction artifacts."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)
    return text.strip()


def extract_metadata(pdf_bytes: bytes) -> PaperMetadata:
    """Extract structured metadata from PDF bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    meta = doc.metadata or {}

    title = meta.get("title", "").strip()
    author_str = meta.get("author", "").strip()

    first_page_text = doc[0].get_text() if len(doc) > 0 else ""
    lines = [l.strip() for l in first_page_text.split("\n") if l.strip()]

    if not title and lines:
        title = max(lines[:10], key=len, default="")

    authors: list[str] = []
    if author_str:
        authors = [a.strip() for a in re.split(r",|;| and ", author_str) if a.strip()]
    else:
        for line in lines[1:5]:
            if re.search(r"[A-Z][a-z]+ [A-Z]", line):
                authors.extend(a.strip() for a in line.split(",") if a.strip())

    full_text = extract_full_text(pdf_bytes)
    abstract = ""
    abs_match = re.search(r"[Aa]bstract[:\s]+(.{200,1500}?)(?=\n\n|\d+\.?\s+[A-Z])", full_text)
    if abs_match:
        abstract = _clean_text(abs_match.group(1))

    doi = ""
    doi_match = re.search(r"10\.\d{4,}/\S+", full_text)
    if doi_match:
        doi = doi_match.group(0).rstrip(".")

    year: int | None = None
    year_match = re.search(r"\b(19|20)\d{2}\b", full_text[:2000])
    if year_match:
        year = int(year_match.group(0))

    journal = meta.get("subject", "").strip() or meta.get("keywords", "").strip() or None

    doc.close()
    return PaperMetadata(
        title=title or "Untitled",
        authors=authors[:10],
        abstract=abstract or full_text[:500],
        doi=doi or None,
        year=year,
        journal=journal,
    )


def extract_full_text(pdf_bytes: bytes) -> str:
    """Extract full plain text from PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return _clean_text("\n\n".join(pages))


def extract_sections(text: str) -> dict[str, str]:
    """
    Split paper text into logical sections using regex header detection.
    Returns dict mapping section name -> content text.
    Unassigned text goes into 'uncategorized'.
    """
    matches: list[tuple[str, int, int]] = []

    for section_name, pattern in SECTION_PATTERNS.items():
        for m in pattern.finditer(text):
            matches.append((section_name, m.start(), m.end()))

    if not matches:
        return {"uncategorized": text[:15_000]}

    matches.sort(key=lambda x: x[1])

    sections: dict[str, str] = {}
    for i, (name, _, end) in enumerate(matches):
        next_start = matches[i + 1][1] if i + 1 < len(matches) else len(text)
        content = text[end:next_start].strip()
        if name in sections:
            sections[name] += "\n\n" + content
        else:
            sections[name] = content

    if not sections:
        sections["uncategorized"] = text[:15_000]

    return sections


def build_priority_context(sections: dict[str, str], max_chars: int = 28_000) -> str:
    """
    Build LLM input by prioritizing high-value sections.
    Order: Abstract → Methods → Results → Conclusion → Discussion
    Omits References and Introduction (low signal for pharma/industrial assessment).
    """
    parts: list[str] = []
    used_chars = 0

    for section_name in LLM_SECTION_PRIORITY:
        content = sections.get(section_name, "").strip()
        if not content:
            continue

        label = section_name.upper()
        header = f"\n\n=== {label} ===\n\n"
        header_len = len(header)

        if used_chars + header_len >= max_chars:
            break

        remaining = max_chars - used_chars - header_len
        if remaining <= 0:
            break

        truncated = content[:remaining]
        parts.append(header + truncated)
        used_chars += header_len + len(truncated)

    if not parts:
        fallback = sections.get("uncategorized", "")
        if fallback:
            return fallback[:max_chars]
        return ""

    return "\n".join(parts)


def chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks for embedding.
    Uses word-boundary splits to keep chunk_size consistent.
    """
    words = text.split()
    size = settings.chunk_size
    overlap = settings.chunk_overlap
    chunks: list[str] = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + size])
        if chunk:
            chunks.append(chunk)
        i += size - overlap
    return chunks
