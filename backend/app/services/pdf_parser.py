"""
PDF parsing service using PyMuPDF.
Extracts text, metadata and splits into chunks for embedding.
"""
from __future__ import annotations
import re
import fitz  # PyMuPDF
from app.models.schemas import PaperMetadata
from app.config import settings


def _clean_text(text: str) -> str:
    """Remove excessive whitespace and fix common PDF extraction artifacts."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)  # join hyphenated line breaks
    return text.strip()


def extract_metadata(pdf_bytes: bytes) -> PaperMetadata:
    """Extract structured metadata from PDF bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    meta = doc.metadata or {}

    # Try PDF metadata first, then fall back to heuristics on first page
    title = meta.get("title", "").strip()
    author_str = meta.get("author", "").strip()

    first_page_text = doc[0].get_text() if len(doc) > 0 else ""
    lines = [l.strip() for l in first_page_text.split("\n") if l.strip()]

    # Heuristic: title is usually the longest line in the first 10 lines
    if not title and lines:
        title = max(lines[:10], key=len, default="")

    # Authors: lines after title that look like names (contain comma or "and")
    authors: list[str] = []
    if author_str:
        authors = [a.strip() for a in re.split(r",|;| and ", author_str) if a.strip()]
    else:
        # Very rough heuristic — grab lines 1-4 after the title
        for line in lines[1:5]:
            if re.search(r"[A-Z][a-z]+ [A-Z]", line):
                authors.extend(a.strip() for a in line.split(",") if a.strip())

    # Abstract: look for "Abstract" header
    full_text = extract_full_text(pdf_bytes)
    abstract = ""
    abs_match = re.search(r"[Aa]bstract[:\s]+(.{200,1500}?)(?=\n\n|\d+\.?\s+[A-Z])", full_text)
    if abs_match:
        abstract = _clean_text(abs_match.group(1))

    # DOI
    doi = ""
    doi_match = re.search(r"10\.\d{4,}/\S+", full_text)
    if doi_match:
        doi = doi_match.group(0).rstrip(".")

    # Year
    year: int | None = None
    year_match = re.search(r"\b(19|20)\d{2}\b", full_text[:2000])
    if year_match:
        year = int(year_match.group(0))

    doc.close()
    return PaperMetadata(
        title=title or "Untitled",
        authors=authors[:10],  # cap at 10
        abstract=abstract or full_text[:500],
        doi=doi or None,
        year=year,
    )


def extract_full_text(pdf_bytes: bytes) -> str:
    """Extract full plain text from PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return _clean_text("\n\n".join(pages))


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
