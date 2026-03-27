import express from "express";
import cors from "cors";
import fs from "fs"; 
import path from "path";
import { fileURLToPath } from 'url'; 

import initializeDatabase from "./config/init.js"; 
import userService from "./router/user.js";
import requestService from "./router/request.js";
import machineService from "./router/machine.js";
import adminService from "./router/admin.js";

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

// 1. Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true })); 

// 2. Setup Upload Directory 
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 3. Routes
app.use("/srs/user", userService);
app.use("/srs/request", requestService);
app.use("/srs/machine", machineService);
app.use("/srs/admin", adminService);
app.use('/uploads', express.static(uploadDir)); 

app.get("/srs", (req, res) => {
    res.send("Secure Remote Server is running!");
});

// 4. Startup Logic
async function startApp() {
    try {
        console.log("Setting up database...");
        await initializeDatabase();
        const server = app.listen(port, () => {
            console.log(`Secure Remote Signature Backend running on port ${port}`);
        });

        server.on("error", (error) => {
            if (error && error.code === "EADDRINUSE") {
                console.error(`Port ${port} is already in use. Backend is likely already running in another terminal.`);
                console.error("Stop the old backend process first, then start again.");
                return;
            }
            console.error("Server runtime error:", error);
            process.exit(1);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startApp();