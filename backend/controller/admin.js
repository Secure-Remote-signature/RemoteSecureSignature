import { open } from "sqlite";
import sqlite3 from "sqlite3";

const sqlite3Verbose = sqlite3.verbose();

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

export default {
  getDashboardSummary,
  healthCheck,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
