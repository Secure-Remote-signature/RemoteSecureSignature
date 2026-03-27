function parseTimeoutMs() {
  const parsed = Number(process.env.CNC_GATEWAY_TIMEOUT_MS || 8000);
  if (!Number.isFinite(parsed) || parsed <= 0) return 8000;
  return Math.min(Math.floor(parsed), 30000);
}

function getGatewayControlUrl() {
  const explicit = String(process.env.CNC_GATEWAY_CONTROL_URL || "").trim();
  if (explicit) return explicit;

  const base = String(process.env.CNC_GATEWAY_URL || "").trim();
  if (!base) return "";

  return `${base.replace(/\/$/, "")}/control`;
}

function getGatewayStatusUrl(deviceId) {
  const explicit = String(process.env.CNC_GATEWAY_STATUS_URL || "").trim();
  if (explicit) {
    return explicit.includes("{deviceId}")
      ? explicit.replaceAll("{deviceId}", encodeURIComponent(deviceId || ""))
      : explicit;
  }

  const base = String(process.env.CNC_GATEWAY_URL || "").trim();
  if (!base) return "";
  const normalized = base.replace(/\/$/, "");

  return deviceId
    ? `${normalized}/status/${encodeURIComponent(deviceId)}`
    : `${normalized}/status`;
}

function buildGatewayHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = String(process.env.CNC_GATEWAY_TOKEN || "").trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = parseTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMachineCommand({ deviceId, action, requestId = null }) {
  const url = getGatewayControlUrl();
  if (!url) {
    return {
      ok: false,
      source: "not-configured",
      statusCode: 503,
      message: "CNC gateway is not configured",
    };
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildGatewayHeaders(),
      body: JSON.stringify({
        deviceId,
        action,
        requestId,
        requestedAt: new Date().toISOString(),
      }),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        source: "gateway",
        statusCode: response.status,
        message: body?.error || `Gateway rejected command (${response.status})`,
        payload: body,
      };
    }

    return {
      ok: true,
      source: "gateway",
      statusCode: response.status,
      message: body?.message || `Command ${action} sent to ${deviceId}`,
      payload: body,
    };
  } catch (error) {
    const isAbort = String(error?.name || "") === "AbortError";
    return {
      ok: false,
      source: "gateway",
      statusCode: 504,
      message: isAbort ? "Gateway timeout" : "Gateway request failed",
      payload: { error: String(error?.message || "Unknown error") },
    };
  }
}

export async function fetchMachineStatus(deviceId = "") {
  const url = getGatewayStatusUrl(deviceId);
  if (!url) {
    return {
      ok: true,
      source: "not-configured",
      statusCode: 200,
      status: "idle",
      message: "Gateway not configured",
    };
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: buildGatewayHeaders(),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        source: "gateway",
        statusCode: response.status,
        status: "unknown",
        message: body?.error || `Gateway status request failed (${response.status})`,
      };
    }

    return {
      ok: true,
      source: "gateway",
      statusCode: response.status,
      status: String(body?.status || "idle").toLowerCase(),
      message: body?.message || "ok",
      payload: body,
    };
  } catch (error) {
    const isAbort = String(error?.name || "") === "AbortError";
    return {
      ok: false,
      source: "gateway",
      statusCode: 504,
      status: "unknown",
      message: isAbort ? "Gateway timeout" : "Gateway request failed",
    };
  }
}
