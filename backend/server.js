const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// 1. ตั้งค่า Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// สร้างโฟลเดอร์เก็บรูปถ้ายังไม่มี
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

let documentQueue = [];

// 2. API สำหรับนิสิต: ยื่นคำร้องขอลงนาม
app.post('/api/request-sign', (req, res) => {
    const { docId, studentName, subject, signatureArea, documentImage } = req.body;

    console.log(`📩 ได้รับคำร้องใหม่: ${subject} จากคุณ ${studentName}`);

    const fileName = `${docId}.png`;
    const filePath = path.join(uploadDir, fileName);
    const base64Data = documentImage.replace(/^data:image\/\w+;base64,/, "");
    
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error("❌ บันทึกรูปภาพล้มเหลว:", err);
            return res.status(500).json({ message: "Failed to save image" });
        }

        const newDoc = {
            docId,
            studentName,
            subject,
            signatureArea,
            imagePath: fileName,
            status: 'pending'
        };

        documentQueue.push(newDoc);
        res.status(200).json({ message: "คำร้องถูกส่งไปยังระบบเรียบร้อยแล้ว", docId });
    });
});

// 3. API สำหรับอาจารย์: ดึงรายการเอกสาร
app.get('/api/pending-docs', (req, res) => {
    res.json(documentQueue.filter(doc => doc.status === 'pending'));
});

// 4. API สำหรับส่งไฟล์รูปภาพ
app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
    console.log(`🚀 Secure Remote Signature Backend running on http://192.168.1.39:${PORT}`);
});