import os
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()

API_BASE_URL = os.getenv("TK_BACKEND_URL", "http://localhost:5000").rstrip("/")


def build_api_url(path: str) -> str:
    if not path:
        return API_BASE_URL

    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{API_BASE_URL}{normalized_path}"
