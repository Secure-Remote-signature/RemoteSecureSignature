import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function buildTransitionPatch(toStatus, actorId = null) {
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

    return { updates, params };
}

async function transitionStatus(db, requestId, toStatus, expectedStatus = null, actorId = null) {
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

    const patch = buildTransitionPatch(toStatus, actorId);
    const sql = `UPDATE requestSign SET ${patch.updates.join(", ")} WHERE requestId = ?`;
    const result = await db.run(sql, [...patch.params, requestId]);
    if (!result || result.changes === 0) {
        return { ok: false, code: 409, error: "Transition failed" };
    }

    return { ok: true };
}

// backend/controller/request.js

const submitRequest = async (req, res) => {
    const { docId, subject, documentImage, ownerId, clientId, message, rtsp, camera, signatureArea } = req.body;

    const fileName = `${docId}.png`;
    const filePath = path.join(uploadDir, fileName);
    const base64Data = documentImage.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', async (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to save image" });
        }

        try {
            const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

            const params = [
                docId,
                new Date().toISOString(),
                subject || null,
                message || "",
                rtsp || camera || "none",
                fileName,
                ownerId,
                clientId,
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
            await db.close();
            
            res.status(200).json({
                message: "Success",
                requestId: result.lastID,
                requestNumber: docId
            });
        } catch (dbErr) {
            console.error("❌ SQL Error Details:", dbErr.message);
            res.status(500).json({ error: "Database error: " + dbErr.message });
        }
    });
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
        const { status, expectedStatus, actorId } = req.body;
        console.log(`📩 Received Update: ID=${id}, Status=${status}`); // เพิ่มไว้เช็ค
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

        const transition = await transitionStatus(db, id, status, expectedStatus || null, actorId || null);
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
        const { toStatus, expectedStatus, actorId } = req.body;
        if (!toStatus) {
            return res.status(400).json({ error: "toStatus is required" });
        }

        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const transition = await transitionStatus(db, id, toStatus, expectedStatus || null, actorId || null);
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