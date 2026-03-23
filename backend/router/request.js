// backend/router/request.js
import express from "express";
import requestController from "../controller/request.js";

const router = express.Router();

router.post("/submit", requestController.submitRequest);
router.get("/pending/:profId", requestController.getPendingForProfessor);
router.put("/update-status/:id", requestController.updateStatus);
router.post("/confirm-signature", requestController.confirmSignature);
router.get("/state/:id", requestController.getRequestState);
router.put("/transition/:id", requestController.transitionRequest);
router.post("/claim-next", requestController.claimNextRequest);
router.get("/history/:profId", requestController.getHistoryByProfessor);

export default router;