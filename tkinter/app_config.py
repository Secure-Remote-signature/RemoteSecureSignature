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


CNC_MQTT_BROKER_HOST = os.getenv("TK_CNC_MQTT_BROKER_HOST", "").strip()
CNC_MQTT_BROKER_PORT = _env_int("TK_CNC_MQTT_BROKER_PORT", 1883)
if CNC_MQTT_BROKER_PORT <= 0 or CNC_MQTT_BROKER_PORT > 65535:
    CNC_MQTT_BROKER_PORT = 1883

CNC_MQTT_TOPIC_PAYLOAD = (
    os.getenv("TK_CNC_MQTT_TOPIC_PAYLOAD")
    or os.getenv("TK_CNC_MQTT_TOPIC")
    or "srs/cnc/signature"
).strip()
CNC_MQTT_TOPIC_STATUS = os.getenv("TK_CNC_MQTT_TOPIC_STATUS", "").strip()
CNC_MQTT_TOPIC_EMRG = os.getenv("TK_CNC_MQTT_TOPIC_EMRG", "").strip()
CNC_MQTT_USERNAME = os.getenv("TK_CNC_MQTT_USERNAME", "").strip()
CNC_MQTT_PASSWORD = os.getenv("TK_CNC_MQTT_PASSWORD", "").strip()
CNC_MQTT_CLIENT_ID = os.getenv("TK_CNC_MQTT_CLIENT_ID", "").strip()
CNC_MQTT_KEEPALIVE_SEC = max(5, _env_int("TK_CNC_MQTT_KEEPALIVE_SEC", 30))
CNC_MQTT_QOS = max(0, min(2, _env_int("TK_CNC_MQTT_QOS", 1)))
CNC_MQTT_STATUS_QOS = max(0, min(2, _env_int("TK_CNC_MQTT_STATUS_QOS", CNC_MQTT_QOS)))
CNC_MQTT_RETRY = max(1, _env_int("TK_CNC_MQTT_RETRY", 3))
CNC_MQTT_PUBLISH_TIMEOUT_SEC = _env_float("TK_CNC_MQTT_PUBLISH_TIMEOUT_SEC", 8.0)
CNC_MQTT_WAIT_FOR_PUBLISH = _env_bool("TK_CNC_MQTT_WAIT_FOR_PUBLISH", True)

# Optional coordinate calibration (applied in Tkinter ExecutionPage before MQTT publish).
CNC_COORD_OFFSET_X_MM = _env_float("TK_CNC_COORD_OFFSET_X_MM", 0.0)
CNC_COORD_OFFSET_Y_MM = _env_float("TK_CNC_COORD_OFFSET_Y_MM", 0.0)
CNC_COORD_SCALE_X = _env_float("TK_CNC_COORD_SCALE_X", 1.0)
CNC_COORD_SCALE_Y = _env_float("TK_CNC_COORD_SCALE_Y", 1.0)
CNC_COORD_FLIP_X = _env_bool("TK_CNC_COORD_FLIP_X", False)
CNC_COORD_FLIP_Y = _env_bool("TK_CNC_COORD_FLIP_Y", False)


def build_api_url(path: str) -> str:
    if not path:
        return API_BASE_URL

    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{API_BASE_URL}{normalized_path}"


def build_auth_headers(controller) -> dict:
    token = getattr(controller, "auth_token", None)
    if not token:
        return {}
    return {
        "Authorization": f"Bearer {token}",
    }
