import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";
import { fetchMachineStatus, sendMachineCommand } from "../lib/machineGateway.js";
import { broadcastRealtimeEvent } from "../lib/realtime.js";
import { getMachineStatusSnapshot } from "../lib/machineStatusHook.js";

const sqlite3Verbose = sqlite3.verbose();

function mapRawStatusToDashboardStatus(rawStatus) {
  const normalized = String(rawStatus || "").trim().toLowerCase();
  if (["busy", "running", "printing", "signing", "working", "drawing", "executing", "homing"].includes(normalized)) {
    return "working";
  }
  if (["offline", "disconnected"].includes(normalized)) {
    return "offline";
  }
  return "idle";
}

const getMachineStatus = async (req, res) => {
  try {
    const deviceId = String(req.query?.deviceId || "").trim();

    const mqttSnapshot = getMachineStatusSnapshot(deviceId);
    if (mqttSnapshot) {
      return res.status(200).json({
        status: mqttSnapshot.dashboardStatus,
        machineState: mqttSnapshot.rawState,
        source: mqttSnapshot.source,
        updatedAt: mqttSnapshot.updatedAt,
        data: mqttSnapshot.payload || null,
      });
    }

    const result = await fetchMachineStatus(deviceId);

    if (!result.ok) {
      return res.status(result.statusCode || 502).json({
        error: result.message || "Unable to fetch machine status",
        status: result.status || "unknown",
      });
    }

    return res.status(200).json({
      status: mapRawStatusToDashboardStatus(result.status),
      machineState: result.status || "unknown",
      source: result.source,
      message: result.message,
      data: result.payload || null,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

const controlMachine = async (req, res) => {
  try {
    const { deviceId, action } = req.body || {};
    const normalizedAction = String(action || "").toUpperCase();
    const allowed = new Set(["E_STOP", "UPDOWN", "HOME"]);

    if (!deviceId || !normalizedAction) {
      return res.status(400).json({ error: "deviceId and action are required" });
    }
    if (!allowed.has(normalizedAction)) {
      return res.status(400).json({ error: "Invalid machine action" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const actorId = Number(req.user?.id || 0);
    const actor = Number.isInteger(actorId) && actorId > 0
      ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId])
      : null;

    const commandId = `CMD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    broadcastRealtimeEvent("machine.command", {
      commandId,
      stage: "sent",
      status: "SENT",
      action: normalizedAction,
      deviceId: String(deviceId),
      user: actor?.userEmail || "-",
      message: `Sending command ${normalizedAction} to ${deviceId}`,
    });

    const gatewayResult = await sendMachineCommand({
      deviceId: String(deviceId),
      action: normalizedAction,
    });

    broadcastRealtimeEvent("machine.command", {
      commandId,
      stage: gatewayResult.ok ? "ack" : "failed",
      status: gatewayResult.ok ? "ACK" : "FAILED",
      action: normalizedAction,
      deviceId: String(deviceId),
      user: actor?.userEmail || "-",
      message: gatewayResult.ok
        ? `Command ${normalizedAction} acknowledged by gateway`
        : gatewayResult.message || `Command ${normalizedAction} failed`,
      gatewayStatusCode: gatewayResult.statusCode,
      source: gatewayResult.source,
    });

    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) && actorId > 0 ? actorId : null,
      actorEmail: actor?.userEmail || null,
      action: "MACHINE_CONTROL",
      targetType: "MACHINE",
      targetId: String(deviceId),
      targetDevice: String(deviceId),
      ipAddress: getClientIp(req),
      status: gatewayResult.ok ? "SUCCESS" : "FAILED",
      details: gatewayResult.ok
        ? `Machine control command ${normalizedAction} sent to ${deviceId}`
        : `Machine control command ${normalizedAction} failed on ${deviceId}: ${gatewayResult.message}`,
      metadata: {
        command: normalizedAction,
        source: gatewayResult.source,
        gatewayStatusCode: gatewayResult.statusCode,
        commandId,
      },
    });

    await db.close();

    if (!gatewayResult.ok) {
      return res.status(gatewayResult.statusCode || 502).json({
        error: gatewayResult.message || "Failed to send command to machine",
        action: normalizedAction,
        deviceId,
      });
    }

    return res.status(200).json({
      message: gatewayResult.message || `Command ${normalizedAction} sent to ${deviceId}`,
      action: normalizedAction,
      deviceId,
      source: gatewayResult.source,
      gatewayStatusCode: gatewayResult.statusCode,
    });
  } catch (error) {
    console.error("controlMachine error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export default {
  getMachineStatus,
  controlMachine,
};