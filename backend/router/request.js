// backend/router/request.js
import express from "express";
import requestController from "../controller/request.js";

const router = express.Router();

router.post("/submit", requestController.submitRequest);
router.get("/pending/:profId", requestController.getPendingForProfessor);

export default router;