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

export default {
  getDashboardSummary,
  healthCheck,
};
