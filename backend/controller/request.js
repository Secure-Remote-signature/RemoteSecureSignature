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

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });
        
        await db.run("UPDATE requestSign SET requestStatus = ? WHERE requestId = ?", [status, id]);
        await db.close();
        res.json({ message: "Status updated" });
    } catch (error) {
        res.status(500).json({ error: "DB Error" });
    }
};

// ฟังก์ชันรับพิกัดลายเซ็นและอัปเดตสถานะ
const confirmSignature = async (req, res) => {
    try {
        const { requestId, points_px } = req.body;
        const db = await open({ filename: "./database/remote.db", driver: sqlite3.Database });

        // 1. อัปเดตสถานะงานเป็น 'Signed' 
        // 2. เก็บพิกัด JSON ลงในคอลัมน์ (แนะนำให้แปลงเป็น String ก่อนเก็บ)
        const sql = `
            UPDATE requestSign 
            SET requestStatus = 'Signed', 
                signatureCoordinates = ? 
            WHERE requestId = ?
        `;

        await db.run(sql, [JSON.stringify(points_px), requestId]);
        await db.close();

        console.log(`✅ Request ${requestId} has been signed and saved.`);
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
        
        // ✅ แก้ SQL: ดึงเฉพาะงานที่ status เป็น 'Pending' เท่านั้น
        const sql = `
            SELECT * FROM requestSign 
            WHERE ownerRequestID = ? AND requestStatus = 'Pending' 
            ORDER BY requestId ASC LIMIT 1
        `;
        
        const request = await db.get(sql, [profId]);
        await db.close();
        res.json(request || null);
    } catch (error) {
        res.status(500).json({ error: "DB Error" });
    }
};

export default { 
    submitRequest, 
    getPendingForProfessor, 
    updateStatus,
    confirmSignature,
    getPendingRequest
};