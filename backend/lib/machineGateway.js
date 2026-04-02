import mqtt from "mqtt";

function parseTimeoutMs() {
  const parsed = Number(process.env.CNC_GATEWAY_TIMEOUT_MS || 8000);
  if (!Number.isFinite(parsed) || parsed <= 0) return 8000;
  return Math.min(Math.floor(parsed), 30000);
}

function firstDefined(keys = [], fallback = "") {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return fallback;
}

function mqttConfig() {
  return {
    host: firstDefined(["CNC_MQTT_BROKER_HOST", "MQTT_BROKER_IP", "TK_CNC_MQTT_BROKER_HOST"], ""),
    port: Number(firstDefined(["CNC_MQTT_BROKER_PORT", "MQTT_PORT", "TK_CNC_MQTT_BROKER_PORT"], "1883")),
    username: firstDefined(["CNC_MQTT_USERNAME", "MQTT_USERNAME", "TK_CNC_MQTT_USERNAME"], ""),
    password: firstDefined(["CNC_MQTT_PASSWORD", "MQTT_PASSWORD", "TK_CNC_MQTT_PASSWORD"], ""),
    clientId: firstDefined(["CNC_MQTT_CLIENT_ID", "TK_CNC_MQTT_CLIENT_ID"], "srs-backend-control"),
    topicEmrg: firstDefined(["CNC_MQTT_TOPIC_EMRG", "TK_CNC_MQTT_TOPIC_EMRG"], "srs/Emrg"),
    topicUpdown: firstDefined(["CNC_MQTT_TOPIC_UPDOWN", "TK_CNC_MQTT_TOPIC_UPDOWN"], "srs/updown"),
    topicControl: firstDefined(["CNC_MQTT_TOPIC_CONTROL"], "srs/control"),
  };
}

function mapActionToMqtt(action, payloadBase, cfg) {
  const normalized = String(action || "").toUpperCase();

  // Current CNC runtime already supports this topic+payload.
  if (normalized === "E_STOP" || normalized === "HOME") {
    return {
      topic: cfg.topicEmrg,
      payload: "no",
      note: normalized === "E_STOP"
        ? "Emergency stop command published to MQTT"
        : "Home command published to MQTT (handled by CNC while IDLE)",
    };
  }

  if (normalized === "UPDOWN") {
    return {
      topic: cfg.topicUpdown,
      payload: "no",
      note: "Up/Down command published to MQTT updown topic",
    };
  }

  return {
    topic: cfg.topicControl,
    payload: JSON.stringify(payloadBase),
    note: "Control command published to MQTT control topic",
  };
}

async function publishControlViaMqtt({ deviceId, action, requestId = null }) {
  const cfg = mqttConfig();
  if (!cfg.host) {
    return {
      ok: false,
      source: "not-configured",
      statusCode: 503,
      message: "CNC gateway and MQTT control are not configured",
    };
  }

  const port = Number.isFinite(cfg.port) && cfg.port > 0 ? cfg.port : 1883;
  const url = `mqtt://${cfg.host}:${port}`;
  const payloadBase = {
    deviceId,
    action,
    requestId,
    requestedAt: new Date().toISOString(),
  };
  const mapped = mapActionToMqtt(action, payloadBase, cfg);

  return await new Promise((resolve) => {
    const client = mqtt.connect(url, {
      username: cfg.username || undefined,
      password: cfg.password || undefined,
      clientId: `${cfg.clientId}-pub-${Date.now()}`,
      reconnectPeriod: 0,
      connectTimeout: Math.min(parseTimeoutMs(), 10000),
    });

    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try {
        client.end(true);
      } catch {
        // ignore close errors
      }
      resolve(result);
    };

    client.on("connect", () => {
      client.publish(mapped.topic, mapped.payload, { qos: 1 }, (err) => {
        if (err) {
          finish({
            ok: false,
            source: "mqtt",
            statusCode: 502,
            message: `MQTT publish failed: ${err.message || err}`,
          });
          return;
        }

        finish({
          ok: true,
          source: "mqtt",
          statusCode: 200,
          message: mapped.note,
          payload: {
            topic: mapped.topic,
            action,
            deviceId,
          },
        });
      });
    });

    client.on("error", (error) => {
      finish({
        ok: false,
        source: "mqtt",
        statusCode: 502,
        message: `MQTT connect failed: ${error?.message || error}`,
      });
    });
  });
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
    return publishControlViaMqtt({ deviceId, action, requestId });
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
