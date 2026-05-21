"""
Tests for papers router.
Covers upload validation, duplicate detection logic, and status endpoint.
"""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

FAKE_AUTH = "Bearer fake-token"


# ---------------------------------------------------------------------------
# Upload endpoint — input validation (no auth needed to hit these guards)
# ---------------------------------------------------------------------------

def test_upload_requires_auth():
    pdf_bytes = b"%PDF-1.4 fake content"
    resp = client.post(
        "/papers/upload",
        files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 401


def test_upload_rejects_non_pdf_extension():
    from unittest.mock import patch, MagicMock
    mock_sb = MagicMock()
    mock_user = MagicMock()
    mock_user.user.id = "user-123"
    mock_sb.auth.get_user.return_value = mock_user

    with patch("app.routers.papers.create_client", return_value=mock_sb):
        resp = client.post(
            "/papers/upload",
            files={"file": ("report.docx", io.BytesIO(b"not a pdf"), "application/vnd.ms-word")},
            headers={"Authorization": FAKE_AUTH},
        )
    assert resp.status_code == 400
    assert "PDF" in resp.json()["detail"]


def test_upload_rejects_file_too_large():
    from unittest.mock import patch, MagicMock
    from app.config import settings

    mock_sb = MagicMock()
    mock_user = MagicMock()
    mock_user.user.id = "user-123"
    mock_sb.auth.get_user.return_value = mock_user

    oversized = b"A" * (settings.max_file_size_mb * 1024 * 1024 + 1)

    with patch("app.routers.papers.create_client", return_value=mock_sb):
        resp = client.post(
            "/papers/upload",
            files={"file": ("big.pdf", io.BytesIO(oversized), "application/pdf")},
            headers={"Authorization": FAKE_AUTH},
        )
    assert resp.status_code == 413


# ---------------------------------------------------------------------------
# _check_duplicate — unit tests (no network)
# ---------------------------------------------------------------------------

def test_check_duplicate_returns_none_when_no_match():
    from unittest.mock import MagicMock
    from app.routers.papers import _check_duplicate

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

    result = _check_duplicate(mock_sb, "user-1", "deadbeef" * 8, None)
    assert result is None


def test_check_duplicate_finds_by_hash():
    from unittest.mock import MagicMock
    from app.routers.papers import _check_duplicate

    existing = {"id": "paper-abc", "title": "Existing Paper"}
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = existing

    result = _check_duplicate(mock_sb, "user-1", "deadbeef" * 8, None)
    assert result == existing
    assert result["id"] == "paper-abc"


def test_check_duplicate_skips_hash_check_when_empty():
    from unittest.mock import MagicMock
    from app.routers.papers import _check_duplicate

    mock_sb = MagicMock()
    # Should not call table() for hash check if file_hash is empty
    result = _check_duplicate(mock_sb, "user-1", "", None)
    assert result is None
    mock_sb.table.assert_not_called()


def test_check_duplicate_falls_through_to_doi():
    from unittest.mock import MagicMock, call
    from app.routers.papers import _check_duplicate

    # Hash check returns None, DOI check returns a match
    existing = {"id": "paper-doi", "title": "DOI Paper"}

    mock_execute = MagicMock()
    mock_execute.data = None  # hash check misses

    mock_doi_execute = MagicMock()
    mock_doi_execute.data = existing  # doi check hits

    mock_sb = MagicMock()
    # First call (hash) → None, second call (doi) → match
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = [
        mock_execute,
        mock_doi_execute,
    ]

    result = _check_duplicate(mock_sb, "user-1", "some-hash", "10.1234/test")
    assert result == existing


# ---------------------------------------------------------------------------
# Status endpoint
# ---------------------------------------------------------------------------

def test_status_requires_auth():
    resp = client.get("/papers/fake-paper-id/status")
    assert resp.status_code == 401


def test_status_returns_404_for_unknown_paper():
    from unittest.mock import patch, MagicMock

    mock_sb = MagicMock()
    mock_user = MagicMock()
    mock_user.user.id = "user-123"
    mock_sb.auth.get_user.return_value = mock_user
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    with patch("app.routers.papers.create_client", return_value=mock_sb), \
         patch("app.routers.papers._supabase", return_value=mock_sb):
        resp = client.get(
            "/papers/nonexistent-id/status",
            headers={"Authorization": FAKE_AUTH},
        )
    assert resp.status_code == 404
