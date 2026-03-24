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


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


CNC_WS_URL = os.getenv("TK_CNC_WS_URL", "ws://192.168.1.117:8765/srs/payload").strip()
CNC_WS_SEND_TIMEOUT_SEC = _env_float("TK_CNC_WS_SEND_TIMEOUT_SEC", 5.0)
CNC_WS_ACK_TIMEOUT_SEC = _env_float("TK_CNC_WS_ACK_TIMEOUT_SEC", 8.0)
CNC_WS_ACK_REQUIRED = _env_bool("TK_CNC_WS_ACK_REQUIRED", True)
CNC_WS_RETRY = max(1, _env_int("TK_CNC_WS_RETRY", 3))


def build_api_url(path: str) -> str:
    if not path:
        return API_BASE_URL

    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{API_BASE_URL}{normalized_path}"
