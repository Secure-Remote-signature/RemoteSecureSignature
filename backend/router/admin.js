import express from "express";
import adminController from "../controller/admin.js";
import { requireAdminAccess } from "../middleware/auth.js";

const admin = express.Router();

admin.use(requireAdminAccess);
admin.get("/health", adminController.healthCheck);
admin.get("/dashboard-summary", adminController.getDashboardSummary);

export default admin;
