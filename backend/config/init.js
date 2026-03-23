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

    const forceReset = String(process.env.FORCE_DB_RESET || "").toLowerCase() === "true";

    console.log("Connected to SQLite database.");

    if (forceReset) {
      console.warn("FORCE_DB_RESET=true -> dropping requestSign table");
      await db.exec("DROP TABLE IF EXISTS requestSign");
    }

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
         signatureCoordinates TEXT,
         createdAt DATETIME,
         updatedAt DATETIME,
         claimedAt DATETIME,
         startedAt DATETIME,
         completedAt DATETIME,
         claimedBy INTEGER,
         stateVersion INTEGER DEFAULT 0
       );
     `);

    const requestSignColumns = await db.all("PRAGMA table_info(requestSign)");
    const hasSignatureArea = requestSignColumns.some((col) => col.name === "signatureArea");
    if (!hasSignatureArea) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN signatureArea TEXT");
      console.log("Added missing column: requestSign.signatureArea");
    }

    const hasSignatureCoordinates = requestSignColumns.some((col) => col.name === "signatureCoordinates");
    if (!hasSignatureCoordinates) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN signatureCoordinates TEXT");
      console.log("Added missing column: requestSign.signatureCoordinates");
    }

    const hasCreatedAt = requestSignColumns.some((col) => col.name === "createdAt");
    if (!hasCreatedAt) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN createdAt DATETIME");
      console.log("Added missing column: requestSign.createdAt");
    }

    const hasUpdatedAt = requestSignColumns.some((col) => col.name === "updatedAt");
    if (!hasUpdatedAt) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN updatedAt DATETIME");
      console.log("Added missing column: requestSign.updatedAt");
    }

    const hasClaimedAt = requestSignColumns.some((col) => col.name === "claimedAt");
    if (!hasClaimedAt) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN claimedAt DATETIME");
      console.log("Added missing column: requestSign.claimedAt");
    }

    const hasStartedAt = requestSignColumns.some((col) => col.name === "startedAt");
    if (!hasStartedAt) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN startedAt DATETIME");
      console.log("Added missing column: requestSign.startedAt");
    }

    const hasCompletedAt = requestSignColumns.some((col) => col.name === "completedAt");
    if (!hasCompletedAt) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN completedAt DATETIME");
      console.log("Added missing column: requestSign.completedAt");
    }

    const hasClaimedBy = requestSignColumns.some((col) => col.name === "claimedBy");
    if (!hasClaimedBy) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN claimedBy INTEGER");
      console.log("Added missing column: requestSign.claimedBy");
    }

    const hasStateVersion = requestSignColumns.some((col) => col.name === "stateVersion");
    if (!hasStateVersion) {
      await db.exec("ALTER TABLE requestSign ADD COLUMN stateVersion INTEGER DEFAULT 0");
      console.log("Added missing column: requestSign.stateVersion");
    }

    await db.exec("CREATE INDEX IF NOT EXISTS idx_request_owner_status ON requestSign(ownerRequestID, requestStatus, requestId DESC)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_request_status_date ON requestSign(requestStatus, requestDate DESC)");

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
