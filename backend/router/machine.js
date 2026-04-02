import express from "express";
import machineController from "../controller/machine.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/status", machineController.getMachineStatus);
router.post("/control", requireAuth, machineController.controlMachine);

export default router;