import express from "express";
import adminController from "../controller/admin.js";
import { requireAdminAccess } from "../middleware/auth.js";

const admin = express.Router();

admin.use(requireAdminAccess);
admin.get("/health", adminController.healthCheck);
admin.get("/dashboard-summary", adminController.getDashboardSummary);
admin.get("/users", adminController.getUsers);
admin.get("/job-history", adminController.getJobHistory);
admin.post("/users", adminController.createUser);
admin.put("/users/:id", adminController.updateUser);
admin.delete("/users/:id", adminController.deleteUser);
admin.get("/audit-logs", adminController.getAuditLogs);

export default admin;
