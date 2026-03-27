import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";

const sqlite3Verbose = sqlite3.verbose();

const SYSTEM_SETTING_DEFAULTS = {
  maintenanceMode: "false",
  systemNotice: "ระบบทำงานปกติ",
  defaultDrawSpeed: "3000",
  defaultPenUpAngle: "40",
  defaultPenDownAngle: "90",
  autoHomeAfterJob: "true",
  sessionTimeoutMinutes: "30",
  maxLoginAttempts: "5",
};

const DEFAULT_CNC_DEVICES = String(process.env.CNC_DEVICE_IDS || "PLT-ENG")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

async function ensureSystemSettingsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS systemSettings (
      settingKey TEXT PRIMARY KEY,
      settingValue TEXT,
      updatedAt DATETIME
    )
  `);

  const now = new Date().toISOString();
  const entries = Object.entries(SYSTEM_SETTING_DEFAULTS);
  for (const [key, value] of entries) {
    await db.run(
      `INSERT OR IGNORE INTO systemSettings (settingKey, settingValue, updatedAt) VALUES (?, ?, ?)`,
      [key, value, now],
    );
  }
}

function mapSystemSettings(rows) {
  const values = { ...SYSTEM_SETTING_DEFAULTS };
  for (const row of rows) {
    values[row.settingKey] = row.settingValue;
  }

  return {
    maintenanceMode: values.maintenanceMode === "true",
    systemNotice: values.systemNotice || "",
    defaultDrawSpeed: Number(values.defaultDrawSpeed || 0),
    defaultPenUpAngle: Number(values.defaultPenUpAngle || 0),
    defaultPenDownAngle: Number(values.defaultPenDownAngle || 0),
    autoHomeAfterJob: values.autoHomeAfterJob === "true",
    sessionTimeoutMinutes: Number(values.sessionTimeoutMinutes || 0),
    maxLoginAttempts: Number(values.maxLoginAttempts || 0),
  };
}

const getDashboardSummary = async (_req, res) => {
  try {
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const [pending, claimed, signing, signed, rejected] = await Promise.all([
      db.get("SELECT COUNT(*) AS total FROM requestSign WHERE requestStatus = 'Pending'"),
      db.get("SELECT COUNT(*) AS total FROM requestSign WHERE requestStatus = 'Claimed'"),
      db.get("SELECT COUNT(*) AS total FROM requestSign WHERE requestStatus = 'Signing'"),
      db.get("SELECT COUNT(*) AS total FROM requestSign WHERE requestStatus = 'Signed'"),
      db.get("SELECT COUNT(*) AS total FROM requestSign WHERE requestStatus = 'Rejected'"),
    ]);

    const users = await db.get("SELECT COUNT(*) AS total FROM users");
    await db.close();

    return res.status(200).json({
      requests: {
        pending: pending?.total || 0,
        claimed: claimed?.total || 0,
        signing: signing?.total || 0,
        signed: signed?.total || 0,
        rejected: rejected?.total || 0,
      },
      users: users?.total || 0,
    });
  } catch (error) {
    console.error("Admin summary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const healthCheck = (_req, res) => {
  res.status(200).json({ message: "admin ok" });
};

const getUsers = async (_req, res) => {
  try {
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const users = await db.all(
      `
      SELECT
        u.userId,
        u.userName,
        u.userLastname,
        u.userEmail,
        u.userRole,
        u.userStatus,
        u.lastLoginAt,
        u.lastActiveAt,
        CASE
          WHEN LOWER(COALESCE(u.userStatus, 'inactive')) = 'active'
            AND u.lastActiveAt IS NOT NULL
            AND ((julianday('now') - julianday(u.lastActiveAt)) * 86400) <= 120
          THEN 'active'
          ELSE 'inactive'
        END AS effectiveStatus,
        u.userfacultyId,
        f.facultyName
      FROM users u
      LEFT JOIN faculties f ON f.facultyId = u.userfacultyId
      ORDER BY u.userId DESC
      `,
    );

    await db.close();
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Admin get users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getCncOverview = async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 300;

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const queueRows = await db.all(
      `
      SELECT
        r.requestId,
        r.requestNumber,
        r.requestDate,
        r.requestStatus,
        r.requestRTSP,
        r.createdAt,
        client.userName AS clientName,
        client.userLastname AS clientLastName,
        owner.userName AS ownerName,
        owner.userLastname AS ownerLastName,
        f.facultyName
      FROM requestSign r
      LEFT JOIN users client ON client.userId = r.clientRequestID
      LEFT JOIN users owner ON owner.userId = r.ownerRequestID
      LEFT JOIN faculties f ON f.facultyId = owner.userfacultyId
      WHERE r.requestStatus IN ('Pending', 'Claimed', 'Signing')
      ORDER BY COALESCE(r.createdAt, r.requestDate) ASC, r.requestId ASC
      LIMIT ?
      `,
      [limit],
    );

    const knownDeviceRows = await db.all(
      `
      SELECT DISTINCT requestRTSP
      FROM requestSign
      WHERE requestRTSP IS NOT NULL AND TRIM(requestRTSP) <> '' AND requestRTSP <> 'none'
      ORDER BY requestRTSP ASC
      LIMIT 100
      `,
    );

    await db.close();

    const byDevice = new Map();

    // Keep a stable machine list so CNC page does not become blank when no queue is active.
    // Current production has a single machine by default; add more via CNC_DEVICE_IDS=PLT-ENG,PLT-SCI.
    for (const defaultDevice of DEFAULT_CNC_DEVICES) {
      byDevice.set(defaultDevice, {
        id: defaultDevice,
        name: defaultDevice,
        faculty: "-",
        status: "ONLINE",
        currentJob: null,
        queue: [],
      });
    }

    for (const row of knownDeviceRows) {
      const deviceId = String(row.requestRTSP || "").trim();
      if (!deviceId || deviceId.toLowerCase() === "none") continue;
      if (!byDevice.has(deviceId)) {
        byDevice.set(deviceId, {
          id: deviceId,
          name: deviceId,
          faculty: "-",
          status: "ONLINE",
          currentJob: null,
          queue: [],
        });
      }
    }

    for (const row of queueRows) {
      const deviceId = String(row.requestRTSP || "none");
      if (!deviceId || deviceId.toLowerCase() === "none") continue;
      if (!byDevice.has(deviceId)) {
        byDevice.set(deviceId, {
          id: deviceId,
          name: deviceId,
          faculty: row.facultyName || "-",
          status: "ONLINE",
          currentJob: null,
          queue: [],
        });
      }

      const target = byDevice.get(deviceId);
      const queueItem = {
        requestId: row.requestId,
        id: row.requestNumber || `REQ-${row.requestId}`,
        targetDevice: deviceId,
        requester: `${row.clientName || ""} ${row.clientLastName || ""}`.trim() || "-",
        signer: `${row.ownerName || ""} ${row.ownerLastName || ""}`.trim() || "-",
        addedAt: row.requestDate || row.createdAt,
        status: row.requestStatus || "Pending",
      };

      target.queue.push(queueItem);
      if ((row.requestStatus === "Signing" || row.requestStatus === "Claimed") && !target.currentJob) {
        target.currentJob = queueItem.id;
        target.status = "BUSY";
      }
    }

    const devices = Array.from(byDevice.values()).map((device) => ({
      id: device.id,
      name: device.name,
      faculty: device.faculty,
      status: device.status,
      currentJob: device.currentJob,
      queueCount: device.queue.length,
      queue: device.queue,
    }));

    return res.status(200).json({ devices });
  } catch (error) {
    console.error("Admin cnc overview error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSystemSettings = async (_req, res) => {
  try {
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    await ensureSystemSettingsTable(db);
    const rows = await db.all("SELECT settingKey, settingValue FROM systemSettings");
    await db.close();

    return res.status(200).json({ settings: mapSystemSettings(rows) });
  } catch (error) {
    console.error("Admin get system settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const payload = req.body || {};
    const now = new Date().toISOString();

    const updatableKeys = Object.keys(SYSTEM_SETTING_DEFAULTS);
    const changedKeys = updatableKeys.filter((key) => Object.prototype.hasOwnProperty.call(payload, key));
    if (changedKeys.length === 0) {
      return res.status(400).json({ error: "No settings provided" });
    }

    const normalizeValue = (key, value) => {
      if (key === "maintenanceMode" || key === "autoHomeAfterJob") {
        return value ? "true" : "false";
      }
      if (["defaultDrawSpeed", "defaultPenUpAngle", "defaultPenDownAngle", "sessionTimeoutMinutes", "maxLoginAttempts"].includes(key)) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`Invalid number for ${key}`);
        }
        return String(Math.floor(parsed));
      }
      return String(value ?? "");
    };

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    await ensureSystemSettingsTable(db);
    for (const key of changedKeys) {
      const normalized = normalizeValue(key, payload[key]);
      await db.run(
        `
        INSERT INTO systemSettings (settingKey, settingValue, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(settingKey) DO UPDATE SET
          settingValue = excluded.settingValue,
          updatedAt = excluded.updatedAt
        `,
        [key, normalized, now],
      );
    }

    const actorIdRaw = req.headers["x-user-id"];
    const actorId = Number(Array.isArray(actorIdRaw) ? actorIdRaw[0] : actorIdRaw);
    const actor = Number.isInteger(actorId) ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId]) : null;
    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) ? actorId : null,
      actorEmail: actor?.userEmail || null,
      action: "SYSTEM_SETTING_UPDATE",
      targetType: "SYSTEM",
      targetId: "systemSettings",
      ipAddress: getClientIp(req),
      status: "SUCCESS",
      details: `Updated system settings (${changedKeys.join(", ")})`,
      metadata: { changedKeys },
    });

    const rows = await db.all("SELECT settingKey, settingValue FROM systemSettings");
    await db.close();

    return res.status(200).json({
      message: "System settings updated successfully",
      settings: mapSystemSettings(rows),
    });
  } catch (error) {
    if (String(error?.message || "").startsWith("Invalid number")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Admin update system settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      userName,
      userLastname,
      userEmail,
      userPassword,
      userRole,
      userPhone,
      userfacultyId,
      userPin,
    } = req.body;

    if (!userName || !userLastname || !userEmail || !userPassword || !userRole || !userfacultyId || !userPin) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const facultyId = Number(userfacultyId);
    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({ error: "Invalid faculty id" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const beforeUser = await db.get(
      `
      SELECT userName, userLastname, userEmail, userRole, userPhone, userfacultyId, userPassword, userPin
      FROM users
      WHERE userId = ?
      `,
      [targetUserId],
    );

    const userDate = new Date().toISOString();
    const result = await db.run(
      `
      INSERT INTO users (userName, userLastname, userDate, userEmail, userPassword, userRole, userPhone, userfacultyId, userPin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(userName).trim(),
        String(userLastname).trim(),
        userDate,
        String(userEmail).trim(),
        String(userPassword),
        String(userRole).trim(),
        userPhone ? String(userPhone).trim() : null,
        facultyId,
        String(userPin).trim(),
      ],
    );

    await db.run(`UPDATE users SET userStatus = 'inactive' WHERE userId = ?`, [result.lastID]);

    const actorIdRaw = req.headers["x-user-id"];
    const actorId = Number(Array.isArray(actorIdRaw) ? actorIdRaw[0] : actorIdRaw);
    const actor = Number.isInteger(actorId) ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId]) : null;
    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) ? actorId : null,
      actorEmail: actor?.userEmail || null,
      action: "ACCOUNT_CREATE",
      targetType: "USER",
      targetId: String(result.lastID),
      ipAddress: getClientIp(req),
      status: "SUCCESS",
      details: `Admin created user ${String(userEmail).trim()}`,
    });

    await db.close();
    return res.status(201).json({ message: "User created successfully", userId: result.lastID });
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ error: "This email is already registered" });
    }

    console.error("Admin create user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = Number(id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const {
      userName,
      userLastname,
      userEmail,
      userRole,
      userPhone,
      userfacultyId,
      userPassword,
      userPin,
    } = req.body;

    if (!userName || !userLastname || !userEmail || !userRole || !userfacultyId) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const facultyId = Number(userfacultyId);
    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({ error: "Invalid faculty id" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const result = await db.run(
      `
      UPDATE users
      SET
        userName = ?,
        userLastname = ?,
        userEmail = ?,
        userRole = ?,
        userPhone = ?,
        userfacultyId = ?,
        userPassword = COALESCE(?, userPassword),
        userPin = COALESCE(?, userPin)
      WHERE userId = ?
      `,
      [
        String(userName).trim(),
        String(userLastname).trim(),
        String(userEmail).trim(),
        String(userRole).trim(),
        userPhone ? String(userPhone).trim() : null,
        facultyId,
        userPassword ? String(userPassword) : null,
        userPin ? String(userPin).trim() : null,
        targetUserId,
      ],
    );

    const actorIdRaw = req.headers["x-user-id"];
    const actorId = Number(Array.isArray(actorIdRaw) ? actorIdRaw[0] : actorIdRaw);
    const actor = Number.isInteger(actorId) ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId]) : null;
    const target = await db.get("SELECT userEmail FROM users WHERE userId = ?", [targetUserId]);

    const changedFields = [];
    if (beforeUser) {
      const nextValues = {
        userName: String(userName).trim(),
        userLastname: String(userLastname).trim(),
        userEmail: String(userEmail).trim(),
        userRole: String(userRole).trim(),
        userPhone: userPhone ? String(userPhone).trim() : null,
        userfacultyId: facultyId,
        userPassword: userPassword ? String(userPassword) : beforeUser.userPassword,
        userPin: userPin ? String(userPin).trim() : beforeUser.userPin,
      };

      if (String(beforeUser.userName ?? "") !== String(nextValues.userName ?? "")) changedFields.push("userName");
      if (String(beforeUser.userLastname ?? "") !== String(nextValues.userLastname ?? "")) changedFields.push("userLastname");
      if (String(beforeUser.userEmail ?? "") !== String(nextValues.userEmail ?? "")) changedFields.push("userEmail");
      if (String(beforeUser.userRole ?? "") !== String(nextValues.userRole ?? "")) changedFields.push("userRole");
      if (String(beforeUser.userPhone ?? "") !== String(nextValues.userPhone ?? "")) changedFields.push("userPhone");
      if (Number(beforeUser.userfacultyId ?? 0) !== Number(nextValues.userfacultyId ?? 0)) changedFields.push("userfacultyId");
      if (String(beforeUser.userPassword ?? "") !== String(nextValues.userPassword ?? "")) changedFields.push("userPassword");
      if (String(beforeUser.userPin ?? "") !== String(nextValues.userPin ?? "")) changedFields.push("userPin");
    }

    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) ? actorId : null,
      actorEmail: actor?.userEmail || null,
      action: "ACCOUNT_UPDATE",
      targetType: "USER",
      targetId: String(targetUserId),
      ipAddress: getClientIp(req),
      status: result.changes > 0 ? "SUCCESS" : "FAILED",
      details: result.changes > 0
        ? `Admin updated user ${target?.userEmail || targetUserId}${changedFields.length > 0 ? ` (${changedFields.join(", ")})` : ""}`
        : `Admin failed to update user ${targetUserId}`,
      metadata: {
        changedFields,
      },
    });

    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "User updated successfully", updatedUserId: targetUserId });
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ error: "This email is already registered" });
    }

    console.error("Admin update user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = Number(id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const requesterIdRaw = req.headers["x-user-id"];
    const requesterId = Number(Array.isArray(requesterIdRaw) ? requesterIdRaw[0] : requesterIdRaw);
    if (Number.isInteger(requesterId) && requesterId === targetUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const result = await db.run("DELETE FROM users WHERE userId = ?", [targetUserId]);

    const actorIdRaw = req.headers["x-user-id"];
    const actorId = Number(Array.isArray(actorIdRaw) ? actorIdRaw[0] : actorIdRaw);
    const actor = Number.isInteger(actorId) ? await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorId]) : null;
    await writeActivityLog(db, {
      actorUserId: Number.isInteger(actorId) ? actorId : null,
      actorEmail: actor?.userEmail || null,
      action: "ACCOUNT_DELETE",
      targetType: "USER",
      targetId: String(targetUserId),
      ipAddress: getClientIp(req),
      status: result.changes > 0 ? "SUCCESS" : "FAILED",
      details: result.changes > 0
        ? `Admin deleted user ${targetUserId}`
        : `Admin failed to delete user ${targetUserId}`,
    });

    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully", deletedUserId: targetUserId });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getJobHistory = async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 200;

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const rows = await db.all(
      `
      SELECT
        r.requestId,
        r.requestNumber,
        r.requestDate,
        r.requestSubject,
        r.requestMessage,
        r.requestStatus,
        r.requestRTSP,
        r.requestPicture,
        r.rejectReason,
        r.signatureCoordinates,
        r.createdAt,
        r.updatedAt,
        r.claimedAt,
        r.startedAt,
        r.completedAt,
        r.cncDispatchedAt,
        r.cncCompletedAt,
        r.cncAttempts,
        r.cncLastError,
        r.stateVersion,
        r.ownerRequestID,
        r.clientRequestID,
        client.userName AS clientName,
        client.userLastname AS clientLastName,
        owner.userName AS ownerName,
        owner.userLastname AS ownerLastName,
        f.facultyName AS facultyName
      FROM requestSign r
      LEFT JOIN users client ON client.userId = r.clientRequestID
      LEFT JOIN users owner ON owner.userId = r.ownerRequestID
      LEFT JOIN faculties f ON f.facultyId = owner.userfacultyId
      ORDER BY r.requestId DESC
      LIMIT ?
      `,
      [limit],
    );

    await db.close();
    return res.status(200).json({ jobs: rows });
  } catch (error) {
    console.error("Admin job history error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 200;

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const logs = await db.all(
      `
      SELECT
        logId,
        eventAt,
        actorEmail,
        action,
        targetDevice,
        ipAddress,
        status,
        details
      FROM activityLogs
      ORDER BY datetime(eventAt) DESC, logId DESC
      LIMIT ?
      `,
      [limit],
    );

    await db.close();

    const mapped = logs.map((row) => ({
      id: `LOG-${row.logId}`,
      timestamp: row.eventAt,
      user: row.actorEmail || "-",
      action: row.action || "UNKNOWN",
      targetDevice: row.targetDevice || "-",
      ipAddress: row.ipAddress || "-",
      status: String(row.status || "WARNING").toUpperCase(),
      details: row.details || "-",
    }));

    return res.status(200).json({ logs: mapped });
  } catch (error) {
    console.error("Admin audit logs error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  getDashboardSummary,
  healthCheck,
  getUsers,
  getCncOverview,
  getSystemSettings,
  updateSystemSettings,
  createUser,
  updateUser,
  deleteUser,
  getJobHistory,
  getAuditLogs,
};
