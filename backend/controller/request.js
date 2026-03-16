// backend/controller/request.js
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

const submitRequest = async (req, res) => {
    const { docId, studentName, subject, documentImage, ownerId, clientId, message, rtsp } = req.body;

    const fileName = `${docId}.png`;
    const filePath = path.join(uploadDir, fileName);
    const base64Data = documentImage.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', async (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to save image" });
        }

        try {
            const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
            const sql = `
                INSERT INTO requestSign (
                    requestNumber, requestDate, requestMessage, 
                    requestRTSP, requestPicture, ownerRequestID, 
                    clientRequestID, requestStatus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
            `;

            await db.run(sql, [docId, new Date().toISOString(), message || subject, rtsp || "none", fileName, ownerId, clientId]);
            await db.close();
            res.status(200).json({ message: "Success", requestId: docId });
        } catch (dbErr) {
            res.status(500).json({ error: "Database error" });
        }
    });
};

// ฟังก์ชันสำหรับ Polling ที่ Python จะมาเรียก
const getPendingForProfessor = async (req, res) => {
    try {
        const { profId } = req.params;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        const request = await db.get(
            "SELECT r.*, u.userName as studentName FROM requestSign r JOIN users u ON r.clientRequestID = u.userId WHERE r.ownerRequestID = ? AND r.requestStatus = 'Pending' ORDER BY r.requestDate ASC LIMIT 1",
            [profId]
        );
        await db.close();
        res.json(request || null);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export default { submitRequest, getPendingForProfessor };