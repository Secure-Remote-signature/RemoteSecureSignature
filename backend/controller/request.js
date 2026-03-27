import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClientIp, writeActivityLog } from '../lib/activityLog.js';
import { broadcastRealtimeEvent } from '../lib/realtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

const REQUEST_STATUS = {
    PENDING: 'Pending',
    CLAIMED: 'Claimed',
    SIGNING: 'Signing',
    SIGNED: 'Signed',
    REJECTED: 'Rejected'
};

const VALID_STATUSES = new Set(Object.values(REQUEST_STATUS));

const TRANSITIONS = {
    [REQUEST_STATUS.PENDING]: new Set([REQUEST_STATUS.CLAIMED, REQUEST_STATUS.SIGNING, REQUEST_STATUS.REJECTED, REQUEST_STATUS.SIGNED]),
    [REQUEST_STATUS.CLAIMED]: new Set([REQUEST_STATUS.SIGNING, REQUEST_STATUS.REJECTED, REQUEST_STATUS.SIGNED]),
    [REQUEST_STATUS.SIGNING]: new Set([REQUEST_STATUS.SIGNED, REQUEST_STATUS.REJECTED]),
    [REQUEST_STATUS.SIGNED]: new Set([]),
    [REQUEST_STATUS.REJECTED]: new Set([])
};

function nowIso() {
    return new Date().toISOString();
}

function buildTransitionPatch(toStatus, actorId = null, rejectReason = null) {
    const updates = [
        "requestStatus = ?",
        "updatedAt = ?",
        "stateVersion = COALESCE(stateVersion, 0) + 1"
    ];
    const params = [toStatus, nowIso()];

    if (toStatus === REQUEST_STATUS.CLAIMED) {
        updates.push("claimedAt = ?");
        params.push(nowIso());
        if (actorId !== null && actorId !== undefined) {
            updates.push("claimedBy = ?");
            params.push(actorId);
        }
    }

    if (toStatus === REQUEST_STATUS.SIGNING) {
        updates.push("startedAt = ?");
        params.push(nowIso());
    }

    if (toStatus === REQUEST_STATUS.SIGNED) {
        updates.push("completedAt = ?");
        params.push(nowIso());
    }

    if (toStatus === REQUEST_STATUS.REJECTED) {
        updates.push("rejectReason = ?");
        params.push(rejectReason || null);
    }

    return { updates, params };
}

async function transitionStatus(db, requestId, toStatus, expectedStatus = null, actorId = null, rejectReason = null) {
    const current = await db.get("SELECT requestStatus FROM requestSign WHERE requestId = ?", [requestId]);
    if (!current) {
        return { ok: false, code: 404, error: "Request not found" };
    }

    if (!VALID_STATUSES.has(toStatus)) {
        return { ok: false, code: 400, error: "Invalid status" };
    }

    if (expectedStatus && current.requestStatus !== expectedStatus) {
        return { ok: false, code: 409, error: `Expected ${expectedStatus} but found ${current.requestStatus}` };
    }

    const allowed = TRANSITIONS[current.requestStatus] || new Set();
    if (current.requestStatus !== toStatus && !allowed.has(toStatus)) {
        return { ok: false, code: 409, error: `Invalid transition ${current.requestStatus} -> ${toStatus}` };
    }

    const patch = buildTransitionPatch(toStatus, actorId, rejectReason);
    const sql = `UPDATE requestSign SET ${patch.updates.join(", ")} WHERE requestId = ?`;
    const result = await db.run(sql, [...patch.params, requestId]);
    if (!result || result.changes === 0) {
        return { ok: false, code: 409, error: "Transition failed" };
    }

    broadcastRealtimeEvent("request.statusChanged", {
        requestId: Number(requestId),
        toStatus,
        fromStatus: current.requestStatus,
    });

    return { ok: true };
}

// backend/controller/request.js

const submitRequest = async (req, res) => {
    try {
        const { docId, subject, documentImage, ownerId, clientId, message, rtsp, camera, signatureArea } = req.body || {};

        const headerUserIdRaw = req.headers["x-user-id"];
        const headerUserId = Number(Array.isArray(headerUserIdRaw) ? headerUserIdRaw[0] : headerUserIdRaw);
        const clientIdNumber = Number(clientId);
        const ownerIdNumber = Number(ownerId);

        if (!Number.isInteger(headerUserId) || headerUserId <= 0) {
            return res.status(401).json({ error: "Unauthorized user context" });
        }

        if (!Number.isInteger(clientIdNumber) || clientIdNumber <= 0) {
            return res.status(400).json({ error: "Invalid clientId" });
        }

        if (headerUserId !== clientIdNumber) {
            return res.status(403).json({ error: "clientId does not match logged-in user" });
        }

        if (!Number.isInteger(ownerIdNumber) || ownerIdNumber <= 0) {
            return res.status(400).json({ error: "Invalid ownerId" });
        }

        if (ownerIdNumber === clientIdNumber) {
            return res.status(400).json({ error: "Cannot send request to yourself" });
        }

        const normalizedDocId = String(docId || `DOC-${Date.now()}`)
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "");
        if (!normalizedDocId) {
            return res.status(400).json({ error: "Invalid document id" });
        }

        const normalizedSubject = String(subject || "").trim();
        const normalizedMessage = String(message || "").trim();
        if (!normalizedSubject) {
            return res.status(400).json({ error: "Subject is required" });
        }
        if (!normalizedMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (normalizedSubject.length > 255 || normalizedMessage.length > 5000) {
            return res.status(400).json({ error: "Request content is too long" });
        }

        const imagePrefixMatch = String(documentImage || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
        if (!imagePrefixMatch) {
            return res.status(400).json({ error: "Invalid image format" });
        }

        const base64Data = String(documentImage).replace(/^data:image\/\w+;base64,/, "");
        if (!base64Data) {
            return res.status(400).json({ error: "Empty image data" });
        }

        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

        const requester = await db.get(
            "SELECT userId, userfacultyId FROM users WHERE userId = ?",
            [clientIdNumber]
        );
        if (!requester) {
            await db.close();
            return res.status(404).json({ error: "Requester not found" });
        }

        const receiver = await db.get(
            "SELECT userId, userRole, userfacultyId FROM users WHERE userId = ?",
            [ownerIdNumber]
        );
        if (!receiver) {
            await db.close();
            return res.status(404).json({ error: "Recipient not found" });
        }

        const receiverRole = String(receiver.userRole || "").toLowerCase();
        if (!["admin", "staff", "professor"].includes(receiverRole)) {
            await db.close();
            return res.status(400).json({ error: "Recipient role is not allowed" });
        }

        if (Number(requester.userfacultyId) !== Number(receiver.userfacultyId)) {
            await db.close();
            return res.status(403).json({ error: "Cannot send request outside your faculty" });
        }

        const fileExt = imagePrefixMatch[1].toLowerCase() === "jpeg" ? "jpg" : imagePrefixMatch[1].toLowerCase();
        const fileName = `${normalizedDocId}-${Date.now()}.${fileExt}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, base64Data, "base64");

        const params = [
            normalizedDocId,
            new Date().toISOString(),
            normalizedSubject,
            normalizedMessage,
            rtsp || camera || "none",
            fileName,
            ownerIdNumber,
            clientIdNumber,
            'Pending',
            JSON.stringify(signatureArea || null),
            nowIso(),
            nowIso()
        ];

        const lifecycleSql = `
            INSERT INTO requestSign (
                requestNumber, requestDate, requestSubject, requestMessage,
                requestRTSP, requestPicture, ownerRequestID,
                clientRequestID, requestStatus, signatureArea,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.run(lifecycleSql, params);

        broadcastRealtimeEvent("request.created", {
            requestId: result.lastID,
            requestNumber: normalizedDocId,
            status: REQUEST_STATUS.PENDING,
        });

        const requesterProfile = await db.get(
            "SELECT userEmail FROM users WHERE userId = ?",
            [clientIdNumber]
        );

        await writeActivityLog(db, {
            actorUserId: clientIdNumber,
            actorEmail: requesterProfile?.userEmail || null,
            action: "SIGN_REQUEST",
            targetType: "REQUEST",
            targetId: String(result.lastID),
            targetDevice: rtsp || camera || "none",
            ipAddress: getClientIp(req),
            status: "SUCCESS",
            details: `Created signature request ${normalizedDocId}`,
            metadata: {
                requestNumber: normalizedDocId,
                ownerId: ownerIdNumber,
                subject: normalizedSubject,
            },
        });

        await db.close();

        return res.status(200).json({
            message: "Success",
            requestId: result.lastID,
            requestNumber: normalizedDocId
        });
    } catch (error) {
        console.error("❌ submitRequest error:", error);
        return res.status(500).json({ error: "Failed to submit request" });
    }
};
const getPendingForProfessor = async (req, res) => {
    try {
        const { profId } = req.params;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const request = await db.get(
            "SELECT r.*, u.userName as studentName, u.userLastname as studentLastName FROM requestSign r JOIN users u ON r.clientRequestID = u.userId WHERE r.ownerRequestID = ? AND r.requestStatus = 'Pending' ORDER BY r.requestId DESC LIMIT 1",
            [profId]
        );
        await db.close();
        res.json(request || null);
    } catch (error) {
        console.error("Error in getPendingForProfessor:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, expectedStatus, actorId, rejectReason } = req.body;
        console.log(`📩 Received Update: ID=${id}, Status=${status}`); // เพิ่มไว้เช็ค
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

        const transition = await transitionStatus(db, id, status, expectedStatus || null, actorId || null, rejectReason || null);

        if (transition.ok && (String(status || '').toLowerCase() === 'signed' || String(status || '').toLowerCase() === 'rejected')) {
            const requestRow = await db.get(
                "SELECT requestNumber, requestRTSP, ownerRequestID FROM requestSign WHERE requestId = ?",
                [id]
            );
            const actorUserId = Number(actorId) || Number(requestRow?.ownerRequestID) || null;
            let actorEmail = null;
            if (actorUserId) {
                const actor = await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorUserId]);
                actorEmail = actor?.userEmail || null;
            }

            await writeActivityLog(db, {
                actorUserId,
                actorEmail,
                action: "SIGN_REQUEST",
                targetType: "REQUEST",
                targetId: String(id),
                targetDevice: requestRow?.requestRTSP || "none",
                ipAddress: getClientIp(req),
                status: String(status || '').toLowerCase() === 'signed' ? 'SUCCESS' : 'FAILED',
                details: String(status || '').toLowerCase() === 'signed'
                    ? `Signed request ${requestRow?.requestNumber || id}`
                    : `Rejected request ${requestRow?.requestNumber || id}${rejectReason ? `: ${rejectReason}` : ''}`,
                metadata: {
                    transitionTo: status,
                    expectedStatus: expectedStatus || null,
                },
            });
        }

        await db.close();

        if (transition.ok) {
            res.json({ message: "Status updated" });
        } else {
            res.status(transition.code || 400).json({ error: transition.error || "No record updated" });
        }
    } catch (error) {
        console.error("❌ Error in updateStatus:", error);
        res.status(500).json({ error: "DB Error" });
    }
};

const confirmSignature = async (req, res) => {
    try {
        const { requestId, points_px } = req.body;
        if (!requestId) {
            return res.status(400).json({ error: "requestId is required" });
        }

        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

        const savePoints = await db.run(
            "UPDATE requestSign SET signatureCoordinates = ?, updatedAt = ?, stateVersion = COALESCE(stateVersion, 0) + 1 WHERE requestId = ?",
            [JSON.stringify(points_px || []), nowIso(), requestId]
        );
        if (!savePoints || savePoints.changes === 0) {
            await db.close();
            return res.status(404).json({ error: "Request not found" });
        }

        const transition = await transitionStatus(db, requestId, REQUEST_STATUS.SIGNED);
        if (transition.ok) {
            const requestRow = await db.get(
                "SELECT requestNumber, requestRTSP, ownerRequestID FROM requestSign WHERE requestId = ?",
                [requestId]
            );
            const actorUserId = Number(requestRow?.ownerRequestID) || null;
            let actorEmail = null;
            if (actorUserId) {
                const actor = await db.get("SELECT userEmail FROM users WHERE userId = ?", [actorUserId]);
                actorEmail = actor?.userEmail || null;
            }

            await writeActivityLog(db, {
                actorUserId,
                actorEmail,
                action: "SIGN_REQUEST",
                targetType: "REQUEST",
                targetId: String(requestId),
                targetDevice: requestRow?.requestRTSP || "none",
                ipAddress: getClientIp(req),
                status: "SUCCESS",
                details: `Signed request ${requestRow?.requestNumber || requestId}`,
                metadata: {
                    source: "confirmSignature",
                },
            });
        }
        await db.close();

        if (!transition.ok) {
            return res.status(transition.code || 409).json({ error: transition.error || "Failed to confirm signature" });
        }

        console.log(`Request ${requestId} has been signed and saved.`);
        res.status(200).json({ message: "Signature confirmed and saved to DB" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save signature data" });
    }
};

const getPendingRequest = async (req, res) => {
    try {
        const { profId } = req.params;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        
        const sql = `
            SELECT * FROM requestSign 
            WHERE ownerRequestID = ? AND requestStatus = 'Pending' 
            ORDER BY requestId DESC LIMIT 1
        `;
        
        const request = await db.get(sql, [profId]);
        await db.close();
        res.json(request || null);
    } catch (error) {
        res.status(500).json({ error: "DB Error" });
    }
};

const getRequestState = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const row = await db.get("SELECT requestId, requestNumber, requestStatus, stateVersion, createdAt, updatedAt, claimedAt, startedAt, completedAt, claimedBy FROM requestSign WHERE requestId = ?", [id]);
        await db.close();

        if (!row) {
            return res.status(404).json({ error: "Request not found" });
        }

        res.json(row);
    } catch (error) {
        console.error("Error in getRequestState:", error);
        res.status(500).json({ error: "DB Error" });
    }
};

const transitionRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { toStatus, expectedStatus, actorId, rejectReason } = req.body;
        if (!toStatus) {
            return res.status(400).json({ error: "toStatus is required" });
        }

        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const transition = await transitionStatus(db, id, toStatus, expectedStatus || null, actorId || null, rejectReason || null);
        await db.close();

        if (!transition.ok) {
            return res.status(transition.code || 400).json({ error: transition.error || "Transition failed" });
        }

        res.json({ message: "Transition applied" });
    } catch (error) {
        console.error("Error in transitionRequest:", error);
        res.status(500).json({ error: "DB Error" });
    }
};

const claimNextRequest = async (req, res) => {
    let db;
    try {
        const { ownerRequestID, claimerId } = req.body;
        if (!ownerRequestID) {
            return res.status(400).json({ error: "ownerRequestID is required" });
        }

        db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        await db.exec("BEGIN IMMEDIATE TRANSACTION");

        const next = await db.get(
            "SELECT requestId FROM requestSign WHERE ownerRequestID = ? AND requestStatus = ? ORDER BY requestId ASC LIMIT 1",
            [ownerRequestID, REQUEST_STATUS.PENDING]
        );

        if (!next) {
            await db.exec("COMMIT");
            await db.close();
            return res.json(null);
        }

        const patch = buildTransitionPatch(REQUEST_STATUS.CLAIMED, claimerId || null);
        const claimSql = `UPDATE requestSign SET ${patch.updates.join(", ")} WHERE requestId = ? AND requestStatus = ?`;
        const claimResult = await db.run(claimSql, [...patch.params, next.requestId, REQUEST_STATUS.PENDING]);

        if (!claimResult || claimResult.changes === 0) {
            await db.exec("ROLLBACK");
            await db.close();
            return res.status(409).json({ error: "Failed to claim request" });
        }

        const claimed = await db.get(
            "SELECT r.*, u.userName as studentName, u.userLastname as studentLastName FROM requestSign r JOIN users u ON r.clientRequestID = u.userId WHERE r.requestId = ?",
            [next.requestId]
        );

        await db.exec("COMMIT");
        await db.close();
        res.json(claimed || null);
    } catch (error) {
        console.error("Error in claimNextRequest:", error);
        try {
            if (db) {
                await db.exec("ROLLBACK");
                await db.close();
            }
        } catch {
            // ignore rollback cleanup errors
        }
        res.status(500).json({ error: "DB Error" });
    }
};

const getHistoryByProfessor = async (req, res) => {
    try {
        const { profId } = req.params;
        const rawLimit = Number(req.query.limit);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 100;

        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const rows = await db.all(
            `
            SELECT
                r.requestId,
                r.requestNumber,
                r.requestSubject,
                r.requestMessage,
                r.requestDate,
                r.requestStatus,
                r.requestRTSP,
                r.requestPicture,
                r.rejectReason,
                r.signatureCoordinates,
                r.ownerRequestID,
                r.clientRequestID,
                r.claimedBy,
                r.stateVersion,
                r.createdAt,
                r.updatedAt,
                r.claimedAt,
                r.startedAt,
                r.completedAt,
                u.userName as studentName,
                u.userLastname as studentLastName,
                p.userName as ownerName,
                p.userLastname as ownerLastName
            FROM requestSign r
            LEFT JOIN users u ON r.clientRequestID = u.userId
            LEFT JOIN users p ON r.ownerRequestID = p.userId
            WHERE r.ownerRequestID = ?
            ORDER BY r.requestId DESC
            LIMIT ?
            `,
            [profId, limit]
        );
        await db.close();

        res.json(rows || []);
    } catch (error) {
        console.error("Error in getHistoryByProfessor:", error);
        res.status(500).json({ error: "DB Error" });
    }
};

const claimNextCncTask = async (req, res) => {
    let db;
    try {
        const { ownerRequestID, machineId } = req.body || {};

        db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        await db.exec("BEGIN IMMEDIATE TRANSACTION");

        const where = [
            "r.requestStatus = ?",
            "r.signatureCoordinates IS NOT NULL",
            "TRIM(r.signatureCoordinates) <> ''",
            "r.cncCompletedAt IS NULL",
            "r.cncDispatchedAt IS NULL"
        ];
        const params = [REQUEST_STATUS.SIGNING];

        if (ownerRequestID) {
            where.unshift("r.ownerRequestID = ?");
            params.unshift(ownerRequestID);
        }

        const next = await db.get(
            `SELECT r.requestId
             FROM requestSign r
             WHERE ${where.join(" AND ")}
             ORDER BY COALESCE(r.startedAt, r.updatedAt, r.requestDate) ASC, r.requestId ASC
             LIMIT 1`,
            params
        );

        if (!next) {
            await db.exec("COMMIT");
            await db.close();
            return res.json(null);
        }

        const dispatchAt = nowIso();
        const claim = await db.run(
            `UPDATE requestSign
             SET cncDispatchedAt = ?,
                 cncAttempts = COALESCE(cncAttempts, 0) + 1,
                 cncLastError = NULL,
                 updatedAt = ?,
                 stateVersion = COALESCE(stateVersion, 0) + 1
             WHERE requestId = ? AND cncDispatchedAt IS NULL AND cncCompletedAt IS NULL`,
            [dispatchAt, dispatchAt, next.requestId]
        );

        if (!claim || claim.changes === 0) {
            await db.exec("ROLLBACK");
            await db.close();
            return res.status(409).json({ error: "Task already claimed" });
        }

        const task = await db.get(
            `SELECT r.requestId, r.requestNumber, r.requestSubject, r.requestMessage,
                    r.requestPicture, r.signatureCoordinates, r.ownerRequestID,
                    r.clientRequestID, r.requestRTSP, r.requestStatus,
                    r.cncDispatchedAt, r.cncAttempts,
                    u.userName as studentName, u.userLastname as studentLastName
             FROM requestSign r
             LEFT JOIN users u ON r.clientRequestID = u.userId
             WHERE r.requestId = ?`,
            [next.requestId]
        );

        await db.exec("COMMIT");
        await db.close();

        res.json({ task, machineId: machineId || null });
    } catch (error) {
        console.error("Error in claimNextCncTask:", error);
        try {
            if (db) {
                await db.exec("ROLLBACK");
                await db.close();
            }
        } catch {
            // ignore rollback cleanup errors
        }
        res.status(500).json({ error: "DB Error" });
    }
};

const reportCncTaskResult = async (req, res) => {
    let db;
    try {
        const { requestId, success, errorMessage } = req.body || {};
        if (!requestId || typeof success !== "boolean") {
            return res.status(400).json({ error: "requestId and success(boolean) are required" });
        }

        db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const row = await db.get(
            "SELECT requestStatus, cncCompletedAt FROM requestSign WHERE requestId = ?",
            [requestId]
        );

        if (!row) {
            await db.close();
            return res.status(404).json({ error: "Request not found" });
        }

        if (success && row.cncCompletedAt) {
            await db.close();
            return res.json({ message: "Task already completed" });
        }

        if (success) {
            const doneAt = nowIso();
            await db.run(
                `UPDATE requestSign
                 SET cncCompletedAt = ?,
                     cncLastError = NULL,
                     updatedAt = ?,
                     stateVersion = COALESCE(stateVersion, 0) + 1
                 WHERE requestId = ?`,
                [doneAt, doneAt, requestId]
            );

            if (row.requestStatus !== REQUEST_STATUS.SIGNED) {
                const transition = await transitionStatus(db, requestId, REQUEST_STATUS.SIGNED);
                if (!transition.ok) {
                    await db.close();
                    return res.status(transition.code || 409).json({ error: transition.error || "Failed to finalize request" });
                }
            }

            await db.close();
            return res.json({ message: "CNC task completed" });
        }

        await db.run(
            `UPDATE requestSign
             SET cncLastError = ?,
                 cncDispatchedAt = NULL,
                 updatedAt = ?,
                 stateVersion = COALESCE(stateVersion, 0) + 1
             WHERE requestId = ?`,
            [errorMessage || "CNC execution failed", nowIso(), requestId]
        );
        await db.close();

        return res.json({ message: "CNC task failure recorded; task is available for retry" });
    } catch (error) {
        console.error("Error in reportCncTaskResult:", error);
        try {
            if (db) {
                await db.close();
            }
        } catch {
            // ignore close errors
        }
        return res.status(500).json({ error: "DB Error" });
    }
};

export default { 
    submitRequest, 
    getPendingForProfessor, 
    updateStatus,
    confirmSignature,
    getPendingRequest,
    getRequestState,
    transitionRequest,
    claimNextRequest,
    getHistoryByProfessor,
    claimNextCncTask,
    reportCncTaskResult
};