import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Enable verbose mode for better error messages
const sqlite3Verbose = sqlite3.verbose();

async function initializeDatabase() {
  try {
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    console.log("Connected to SQLite database.");

    await db.exec(`
       CREATE TABLE IF NOT EXISTS faculties (
         facultyId INTEGER PRIMARY KEY AUTOINCREMENT,
         facultyName TEXT NOT NULL UNIQUE
       );
    `);

    await db.exec(`
       CREATE TABLE IF NOT EXISTS users (
        userId INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT,
        userLastname TEXT,
        userDate TEXT,
        userEmail TEXT UNIQUE,
        userPassword TEXT,
        userRole TEXT,
        userPhone TEXT,
        userfacultyId INTEGER,
        userPin TEXT,
        FOREIGN KEY (userfacultyId) REFERENCES faculties(facultyId)
       );`
      );
    await db.exec(`
       CREATE TABLE IF NOT EXISTS requestSign (
         requestId INTEGER PRIMARY KEY AUTOINCREMENT,
         requestNumber TEXT NOT NULL,
         requestDate DATETIME NOT NULL,
         requestMessage TEXT NOT NULL,
         requestRTSP TEXT NOT NULL,
         requestPicture TEXT NOT NULL,
         ownerRequestID INTEGER NOT NULL,
         clientRequestID INTEGER NOT NULL,
         requestStatus TEXT DEFAULT 'Pending',
         signatureArea TEXT,
         signatureCoordinates TEXT
       );
     `);

    const requestSignColumns = await db.all("PRAGMA table_info(requestSign)");
    const hasSignatureArea = requestSignColumns.some((col) => col.name === "signatureArea");
    if (!hasSignatureArea) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN signatureArea TEXT");
      console.log("Added missing column: requestSign.signatureArea");
    }

    const facultyCheck = await db.get("SELECT COUNT(*) as count FROM faculties");
    if (facultyCheck.count === 0) {
      const defaultFaculties = [
        "คณะวิศวกรรมศาสตร์",
        "คณะวิทยาศาสตร์",
        "คณะวิทยาการจัดการ",
        "คณะเศรษฐศาสตร์",
        "คณะพาณิชยนาวีนานาชาติ"
      ];

      for (const name of defaultFaculties) {
        await db.run("INSERT INTO faculties (facultyName) VALUES (?)", [name]);
      }
      console.log("Default faculties seeded!");
    }

    console.log("Database initialized successfully!");
    await db.close();
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Modern ES Module export
export default initializeDatabase;
