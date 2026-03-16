import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import initializeDatabase from "./config/init.js"; 
import userService from "./router/user.js";

// Setup __dirname for ES Modules (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

// 1. Middleware (Merged configurations from both branches)
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Replaces bodyParser.json()
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Replaces bodyParser.urlencoded()

// 2. Setup Upload Directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Temporary in-memory queue (Recommended to move to Database in the future)
let documentQueue = []; 

// 3. Routes
app.use("/srs/user", userService);
app.use('/uploads', express.static(uploadDir));

app.get("/srs", (req, res) => {
    res.send("Secure Remote Server is running!");
});

// Student API: Submit signing request (Migrated from master)
app.post('/api/request-sign', (req, res) => {
    const { docId, studentName, subject, signatureArea, documentImage } = req.body;
    const fileName = `${docId}.png`;
    const filePath = path.join(uploadDir, fileName);
    
    // Process base64 image data
    const base64Data = documentImage.replace(/^data:image\/\w+;base64,/, "");
    
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error("❌ Failed to save image:", err);
            return res.status(500).json({ message: "Failed to save image" });
        }

        documentQueue.push({
            docId, 
            studentName, 
            subject, 
            signatureArea, 
            imagePath: fileName, 
            status: 'pending'
        });
        
        res.status(200).json({ message: "Request submitted successfully", docId });
    });
});

// 4. Startup Logic (Using dev structure for database support)
async function startApp() {
    try {
        console.log("Setting up database...");
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`🚀 Secure Remote Signature Backend running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startApp();