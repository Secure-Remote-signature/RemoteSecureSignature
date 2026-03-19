// backend/router/request.js
import express from "express";
import requestController from "../controller/request.js";

const router = express.Router();

router.post("/submit", requestController.submitRequest);
router.get("/pending/:profId", requestController.getPendingForProfessor);
router.put("/update-status/:id", requestController.updateStatus);
router.post("/confirm-signature", requestController.confirmSignature);

export default router;