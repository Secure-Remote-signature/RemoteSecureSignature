import express from "express";
import machineController from "../controller/machine.js";

const router = express.Router();

router.get("/status", machineController.getMachineStatus);

export default router;