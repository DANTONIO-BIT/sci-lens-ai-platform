"""
Tests for pdf_parser service.
These tests use synthetic text (no real PDFs) to verify parsing logic.
"""
import pytest
from app.services import pdf_parser


# ---------------------------------------------------------------------------
# _clean_text
# ---------------------------------------------------------------------------

def test_clean_text_collapses_whitespace():
    raw = "This   has\t\textra   spaces\n\n  and newlines"
    cleaned = pdf_parser._clean_text(raw)
    assert "  " not in cleaned
    assert "\t" not in cleaned


def test_clean_text_fixes_hyphenation():
    # Common PDF artifact: words broken across lines
    raw = "poly- mer chains are im- portant"
    cleaned = pdf_parser._clean_text(raw)
    assert "polymer" in cleaned
    assert "important" in cleaned


# ---------------------------------------------------------------------------
# extract_sections
# ---------------------------------------------------------------------------

SAMPLE_PAPER = """\
Abstract
This study investigates the effect of compound X on cell viability.
Results showed a 50% reduction in IC50 values.

Methods
Cell lines were treated with compound X at concentrations 0.1–100 µM.
MTT assay was performed in triplicate at 72 h.

Results
Compound X demonstrated dose-dependent cytotoxicity (IC50 = 12.4 µM).
Western blot confirmed apoptosis via caspase-3 activation.

Conclusion
Compound X shows potential as an anti-cancer agent at TRL 2-3 stage.

References
1. Smith et al. (2020) J Med Chem.
"""


def test_extract_sections_finds_abstract():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    assert "abstract" in sections
    assert "compound x" in sections["abstract"].lower()


def test_extract_sections_finds_methods():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    assert "methods" in sections
    assert "mtt" in sections["methods"].lower()


def test_extract_sections_finds_results():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    assert "results" in sections
    assert "ic50" in sections["results"].lower()


def test_extract_sections_finds_conclusion():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    assert "conclusion" in sections


def test_extract_sections_excludes_references_content():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    # References section should be parsed but not included by build_priority_context
    combined = pdf_parser.build_priority_context(sections)
    assert "Smith et al." not in combined


def test_extract_sections_fallback_on_no_headers():
    plain = "A" * 20_000
    sections = pdf_parser.extract_sections(plain)
    assert "uncategorized" in sections
    assert len(sections["uncategorized"]) <= 15_000


# ---------------------------------------------------------------------------
# build_priority_context
# ---------------------------------------------------------------------------

def test_build_priority_context_respects_max_chars():
    sections = pdf_parser.extract_sections(SAMPLE_PAPER)
    context = pdf_parser.build_priority_context(sections, max_chars=500)
    assert len(context) <= 600  # small buffer for section headers


def test_build_priority_context_order():
    sections = {
        "abstract": "ABSTRACT_CONTENT",
        "methods": "METHODS_CONTENT",
        "results": "RESULTS_CONTENT",
        "conclusion": "CONCLUSION_CONTENT",
        "discussion": "DISCUSSION_CONTENT",
        "introduction": "INTRO_CONTENT",
    }
    context = pdf_parser.build_priority_context(sections)
    abs_pos = context.find("ABSTRACT_CONTENT")
    methods_pos = context.find("METHODS_CONTENT")
    results_pos = context.find("RESULTS_CONTENT")
    assert abs_pos < methods_pos < results_pos


def test_build_priority_context_empty_sections():
    context = pdf_parser.build_priority_context({})
    assert context == ""


# ---------------------------------------------------------------------------
# chunk_text
# ---------------------------------------------------------------------------

def test_chunk_text_produces_chunks():
    text = " ".join(["word"] * 1000)
    chunks = pdf_parser.chunk_text(text)
    assert len(chunks) > 1


def test_chunk_text_no_empty_chunks():
    text = " ".join(["word"] * 500)
    chunks = pdf_parser.chunk_text(text)
    assert all(len(c) > 0 for c in chunks)


def test_chunk_text_handles_short_text():
    text = "short text"
    chunks = pdf_parser.chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == "short text"


def test_chunk_text_overlap_means_words_repeat():
    from app.config import settings
    words = [str(i) for i in range(settings.chunk_size + settings.chunk_overlap + 5)]
    text = " ".join(words)
    chunks = pdf_parser.chunk_text(text)
    # The first word of chunk[1] should also appear at the end of chunk[0]
    if len(chunks) > 1:
        first_words_of_second = set(chunks[1].split()[:settings.chunk_overlap])
        last_words_of_first = set(chunks[0].split()[-settings.chunk_overlap:])
        assert first_words_of_second & last_words_of_first  # overlap exists
