import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";
import { fetchMachineStatus, sendMachineCommand } from "../lib/machineGateway.js";

const sqlite3Verbose = sqlite3.verbose();

const getMachineStatus = async (req, res) => {
  try {
    const deviceId = String(req.query?.deviceId || "").trim();
    const result = await fetchMachineStatus(deviceId);

    if (!result.ok) {
      return res.status(result.statusCode || 502).json({
        error: result.message || "Unable to fetch machine status",
        status: result.status || "unknown",
      });
    }

    return res.status(200).json({
      status: result.status || "idle",
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
    const allowed = new Set(["E_STOP", "TEST_PEN", "HOME"]);

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

    const actorIdRaw = req.headers["x-user-id"];
    const actorId = Number(Array.isArray(actorIdRaw) ? actorIdRaw[0] : actorIdRaw);
    const actor = Number.isInteger(actorId)
      ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId])
      : null;

    const gatewayResult = await sendMachineCommand({
      deviceId: String(deviceId),
      action: normalizedAction,
    });

    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) ? actorId : null,
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