import { open } from "sqlite";
import sqlite3Verbose from "sqlite3";

const createUser = async (req, res) => {
  try {
    const { userName, useEmail, userPassword, userRole, userPhone } = req.body;
    console.log(userName)
    if (!userName || !useEmail || !userPassword || !userRole || !userPhone) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const userDate = new Date().toISOString();

    const result = await db.run(
      `
      INSERT INTO users (userName, userDate, useEmail, userPassword, userRole, userPhone)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [userName, userDate, useEmail, userPassword, userRole, userPhone],
    );

    await db.close();

    res.status(201).json({
      message: "User created successfully!",
      userId: result.lastID,
      userName: userName,
    });
      
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.code === "SQLITE_CONSTRAINT") {
      return res
        .status(409)
        .json({ error: "This email is already registered." });
    }

    res.status(500).json({ error: "Internal server erro3r" });
  }
};

export default {
  createUser,
};
