import { open } from "sqlite";
import sqlite3 from "sqlite3";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";

const sqlite3Verbose = sqlite3.verbose();
const JWT_SECRET = String(process.env.JWT_SECRET || "dev-secret-change-me");
const AUTH_DENY_DEDUPE_WINDOW_MS = Number(process.env.AUTH_DENY_DEDUPE_WINDOW_MS || 30000);
const recentAuthDeny = new Map();

function shouldSkipDuplicateAuthDeny(req, { status, details, action }) {
  const now = Date.now();
  const key = [
    getClientIp(req),
    req.method,
    req.originalUrl || req.url,
    status,
    action,
    details,
  ].join("|");

  const lastSeen = recentAuthDeny.get(key);
  if (lastSeen && now - lastSeen < AUTH_DENY_DEDUPE_WINDOW_MS) {
    return true;
  }

  recentAuthDeny.set(key, now);

  if (recentAuthDeny.size > 2000) {
    const expiry = now - AUTH_DENY_DEDUPE_WINDOW_MS;
    for (const [cacheKey, seenAt] of recentAuthDeny.entries()) {
      if (seenAt < expiry) {
        recentAuthDeny.delete(cacheKey);
      }
    }
  }

  return false;
}

async function logAuthDeny(req, { status = "FAILED", details = "Unauthorized", action = "ACCESS_DENIED" } = {}) {
  try {
    if (shouldSkipDuplicateAuthDeny(req, { status, details, action })) {
      return;
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    await writeActivityLog(db, {
      actorUserId: null,
      actorEmail: null,
      action,
      targetType: "API",
      targetId: `${req.method} ${req.originalUrl || req.url}`,
      targetDevice: "-",
      ipAddress: getClientIp(req),
      status,
      details,
      metadata: {
        method: req.method,
        path: req.originalUrl || req.url,
      },
    });

    await db.close();
  } catch (error) {
    console.error("logAuthDeny error:", error);
  }
}

export async function requireAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    await logAuthDeny(req, {
      action: "UNAUTHORIZED",
      details: "Missing or invalid Authorization header",
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    await logAuthDeny(req, {
      action: "UNAUTHORIZED",
      details: "Empty bearer token",
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: Number(decoded?.sub || decoded?.id || 0),
      role: String(decoded?.role || ""),
      email: String(decoded?.email || ""),
      raw: decoded,
    };
  } catch {
    await logAuthDeny(req, {
      action: "UNAUTHORIZED",
      details: "Invalid or expired token",
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

export async function requireAdminRole(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!role.includes("admin")) {
    await logAuthDeny(req, {
      action: "FORBIDDEN",
      details: `Admin role required, received role: ${role || "unknown"}`,
    });
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

export async function requireAdminAccess(req, res, next) {
  return requireAuth(req, res, () => requireAdminRole(req, res, next));
}
