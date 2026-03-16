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
       CREATE TABLE IF NOT EXISTS users (
        userId INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT,
        userLastname TEXT,
        userDate TEXT,
        userEmail email UNIQUE,
        userPassword TEXT,
        userRole TEXT,
        userPhone TEXT,
        userDepId TEXT,
        userDepname TEXT
      );
     `);
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
         requestStatus TEXT DEFAULT 'Pending'
       );
     `);

    console.log("Database initialized successfully!");
    await db.close();
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Modern ES Module export
export default initializeDatabase;
