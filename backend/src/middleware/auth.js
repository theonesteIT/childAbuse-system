import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: token missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
}

export function adminRequired(req, res, next) {
  if (!req.auth || req.auth.accountType !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" });
  }

  return next();
}

export function userRequired(req, res, next) {
  if (!req.auth || req.auth.accountType !== "user") {
    return res.status(403).json({ message: "Forbidden: reporter/parent access required" });
  }

  return next();
}
