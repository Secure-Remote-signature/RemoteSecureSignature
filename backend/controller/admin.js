import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";

const sqlite3Verbose = sqlite3.verbose();

const getDashboardSummary = async (_req, res) => {
  try {
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
  createUser,
  updateUser,
  deleteUser,
  getJobHistory,
  getAuditLogs,
};
