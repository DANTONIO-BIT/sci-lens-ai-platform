"""
Shared test setup.

`app.config.Settings()` requires several secrets at import time. Tests must not
depend on real credentials, so we inject harmless dummy values here — conftest is
imported by pytest before any test module (and therefore before `app.config`),
so these are in place by the time Settings() validates. `setdefault` means a real
local .env or exported vars still take precedence.
"""
import os

os.environ.setdefault("OPENROUTER_API_KEY", "test-openrouter-key")
os.environ.setdefault("JINA_API_KEY", "test-jina-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
