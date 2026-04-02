import { broadcastRealtimeEvent } from "./realtime.js";

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(",")[0].trim();
  }

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "-";
}

export async function writeActivityLog(db, payload = {}) {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS activityLogs (
        logId INTEGER PRIMARY KEY AUTOINCREMENT,
        eventAt DATETIME NOT NULL,
        actorUserId INTEGER,
        actorEmail TEXT,
        action TEXT NOT NULL,
        targetType TEXT,
        targetId TEXT,
        targetDevice TEXT,
        ipAddress TEXT,
        status TEXT,
        details TEXT,
        metadata TEXT
      )
    `);

    const {
      actorUserId = null,
      actorEmail = null,
      action = "UNKNOWN",
      targetType = null,
      targetId = null,
      targetDevice = null,
      ipAddress = "-",
      status = "SUCCESS",
      details = "",
      metadata = null,
      eventAt = new Date().toISOString(),
    } = payload;

    const result = await db.run(
      `
      INSERT INTO activityLogs (
        eventAt,
        actorUserId,
        actorEmail,
        action,
        targetType,
        targetId,
        targetDevice,
        ipAddress,
        status,
        details,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventAt,
        actorUserId,
        actorEmail,
        String(action || "UNKNOWN"),
        targetType,
        targetId,
        targetDevice,
        String(ipAddress || "-"),
        String(status || "WARNING").toUpperCase(),
        String(details || ""),
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    broadcastRealtimeEvent("audit-log.created", {
      id: `LOG-${result?.lastID || ""}`,
      timestamp: eventAt,
      user: actorEmail || "-",
      action: String(action || "UNKNOWN"),
      targetDevice: targetDevice || "-",
      ipAddress: String(ipAddress || "-"),
      status: String(status || "WARNING").toUpperCase(),
      details: String(details || ""),
      targetType: targetType || null,
      targetId: targetId || null,
    });
  } catch (error) {
    console.error("writeActivityLog error:", error);
  }
}
