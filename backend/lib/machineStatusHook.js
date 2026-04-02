import mqtt from "mqtt";
import { broadcastRealtimeEvent } from "./realtime.js";

const DEFAULT_DEVICE_IDS = String(process.env.CNC_DEVICE_IDS || "PLT-ENG")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function firstDefined(keys = [], fallback = "") {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return fallback;
}

const MQTT_HOST = firstDefined(["CNC_MQTT_BROKER_HOST", "MQTT_BROKER_IP", "TK_CNC_MQTT_BROKER_HOST"], "");
const MQTT_PORT = Number(firstDefined(["CNC_MQTT_BROKER_PORT", "MQTT_PORT", "TK_CNC_MQTT_BROKER_PORT"], "1883"));
const MQTT_USERNAME = firstDefined(["CNC_MQTT_USERNAME", "MQTT_USERNAME", "TK_CNC_MQTT_USERNAME"], "");
const MQTT_PASSWORD = firstDefined(["CNC_MQTT_PASSWORD", "MQTT_PASSWORD", "TK_CNC_MQTT_PASSWORD"], "");
const MQTT_CLIENT_ID = firstDefined(["CNC_MQTT_CLIENT_ID", "TK_CNC_MQTT_CLIENT_ID"], "srs-backend-status");
const MQTT_STATUS_TOPIC = firstDefined(["CNC_MQTT_TOPIC_STATUS", "TK_CNC_MQTT_TOPIC_STATUS"], "srs/status");

let mqttClient = null;
let isStarted = false;
const latestStatusByDevice = new Map();

function normalizeState(rawState) {
  const state = String(rawState || "").trim().toLowerCase();
  if (!state) return "unknown";

  if (["idle", "ready"].includes(state)) return "idle";
  if (["homing", "drawing", "executing", "working", "busy", "running", "printing", "signing"].includes(state)) return "working";
  if (["halted", "emergency_stop", "emergency", "e_stop", "estop", "stop"].includes(state)) return "halted";
  if (["finished", "done", "completed"].includes(state)) return "finished";
  if (["offline", "disconnected"].includes(state)) return "offline";
  if (["error", "failed", "fault"].includes(state)) return "error";

  return state;
}

function toAdminStatus(normalizedState) {
  if (normalizedState === "offline") return "OFFLINE";
  if (normalizedState === "error" || normalizedState === "halted") return "ERROR";
  if (["working", "homing", "drawing", "executing", "busy", "running", "printing", "signing"].includes(normalizedState)) {
    return "BUSY";
  }
  return "ONLINE";
}

function parseMessage(rawPayload) {
  const text = String(rawPayload || "").trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Keep text-only fallback for simple payloads like "IDLE".
  }

  return { state: text };
}

function resolveDeviceId(payload) {
  const possible = [
    payload?.deviceId,
    payload?.machineId,
    payload?.requestRTSP,
    payload?.targetDevice,
  ];

  for (const value of possible) {
    const text = String(value || "").trim();
    if (text) return text;
  }

  return DEFAULT_DEVICE_IDS[0] || "PLT-ENG";
}

function updateStatusFromPayload(payload, source = "mqtt") {
  if (!payload || typeof payload !== "object") return null;

  const rawState =
    payload.state ??
    payload.status ??
    payload.machineStatus ??
    payload.machine_state ??
    payload.currentState ??
    "unknown";

  const normalizedState = normalizeState(rawState);
  const deviceId = resolveDeviceId(payload);

  const snapshot = {
    deviceId,
    rawState: String(rawState || normalizedState),
    normalizedState,
    dashboardStatus:
      normalizedState === "working"
        ? "working"
        : ["offline", "error", "halted"].includes(normalizedState)
          ? "offline"
          : "idle",
    adminStatus: toAdminStatus(normalizedState),
    source,
    updatedAt: new Date().toISOString(),
    payload,
  };

  latestStatusByDevice.set(deviceId, snapshot);

  broadcastRealtimeEvent("machine.status", {
    deviceId: snapshot.deviceId,
    status: snapshot.dashboardStatus,
    adminStatus: snapshot.adminStatus,
    machineState: snapshot.rawState,
    updatedAt: snapshot.updatedAt,
    source: snapshot.source,
  });

  return snapshot;
}

export function getMachineStatusSnapshot(deviceId = "") {
  const normalizedDeviceId = String(deviceId || "").trim();
  if (normalizedDeviceId && latestStatusByDevice.has(normalizedDeviceId)) {
    return latestStatusByDevice.get(normalizedDeviceId);
  }

  if (normalizedDeviceId && latestStatusByDevice.size === 1) {
    const firstSingle = latestStatusByDevice.values().next();
    if (!firstSingle.done) return firstSingle.value;
  }

  if (!normalizedDeviceId) {
    const defaultDevice = DEFAULT_DEVICE_IDS[0] || "";
    if (defaultDevice && latestStatusByDevice.has(defaultDevice)) {
      return latestStatusByDevice.get(defaultDevice);
    }
  }

  const first = latestStatusByDevice.values().next();
  if (!first.done) return first.value;

  return null;
}

export function startMachineStatusHook() {
  if (isStarted) return;
  isStarted = true;

  if (!MQTT_HOST || !MQTT_STATUS_TOPIC) {
    console.log("[machine-status-hook] MQTT status hook disabled (missing host/topic)");
    return;
  }

  const url = `mqtt://${MQTT_HOST}:${Number.isFinite(MQTT_PORT) ? MQTT_PORT : 1883}`;
  mqttClient = mqtt.connect(url, {
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    clientId: `${MQTT_CLIENT_ID}-backend-sub`,
    reconnectPeriod: 1500,
  });

  mqttClient.on("connect", () => {
    mqttClient.subscribe(MQTT_STATUS_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error("[machine-status-hook] subscribe failed:", err.message || err);
        return;
      }
      console.log(`[machine-status-hook] subscribed to ${MQTT_STATUS_TOPIC}`);
    });
  });

  mqttClient.on("message", (_topic, message) => {
    const payload = parseMessage(message.toString("utf-8"));
    if (!payload) return;
    updateStatusFromPayload(payload, "mqtt");
  });

  mqttClient.on("error", (error) => {
    console.error("[machine-status-hook] mqtt error:", error?.message || error);
  });

  mqttClient.on("close", () => {
    console.log("[machine-status-hook] mqtt disconnected, waiting to reconnect...");
  });
}
