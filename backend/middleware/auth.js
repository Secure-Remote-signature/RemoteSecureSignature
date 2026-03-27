export function requireAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

export function requireAdminRole(req, res, next) {
  const role = String(req.headers["x-user-role"] || "").toLowerCase();
  if (!role.includes("admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

export function requireAdminAccess(req, res, next) {
  return requireAuth(req, res, () => requireAdminRole(req, res, next));
}
