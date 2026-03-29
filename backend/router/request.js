// backend/router/request.js
import express from "express";
import requestController from "../controller/request.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/submit", requireAuth, requestController.submitRequest);
router.get("/pending/:profId", requireAuth, requestController.getPendingForProfessor);
router.put("/update-status/:id", requireAuth, requestController.updateStatus);
router.post("/confirm-signature", requireAuth, requestController.confirmSignature);
router.get("/state/:id", requireAuth, requestController.getRequestState);
router.put("/transition/:id", requireAuth, requestController.transitionRequest);
router.post("/claim-next", requireAuth, requestController.claimNextRequest);
router.get("/history/:profId", requireAuth, requestController.getHistoryByProfessor);
router.get("/history-created/:clientId", requireAuth, requestController.getHistoryByRequester);
router.post("/cnc/claim-next", requestController.claimNextCncTask);
router.post("/cnc/report-result", requestController.reportCncTaskResult);

export default router;