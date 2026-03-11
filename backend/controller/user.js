import { open } from "sqlite";
import sqlite3Verbose from "sqlite3";

const createUser = async (req, res) => {
  try {
    const { userName, userEmail, userPassword, userRole, userPhone, userDepId, userDepname } = req.body;
    console.log(userName);
    if (!userName || !userEmail || !userPassword || !userRole || !userPhone) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const userDate = new Date().toISOString();

    const result = await db.run(
      `
      INSERT INTO users (userName, userDate, userEmail, userPassword, userRole, userPhone, userDepId, userDepname)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userName,
        userDate,
        userEmail,
        userPassword,
        userRole,
        userPhone,
        userDepId,
        userDepname,
      ],
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

const deluser = async (req, res) => {
  try {
    // 1. Get the user ID from the request URL parameters (e.g., /deleteuser/1)
    const userId = req.params.id;
    console.log(userId);
    // 2. Validate that an ID was provided
    if (!userId) {
      return res
        .status(400)
        .json({ error: "User ID is required to delete a user!" });
    }

    const db = await open({
      filename: "./database/remote.db", // Matching the filename you provided
      driver: sqlite3Verbose.Database,
    });

    const result = await db.run(`DELETE FROM users WHERE userId = ?`, [userId]);

    await db.close();

    // 6. Check if the user actually existed in the database
    // `result.changes` tells us how many rows were deleted
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "User not found. No user was deleted." });
    }

    // 7. Send the success response
    res.status(200).json({
      message: "User deleted successfully!",
      deletedUserId: userId,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      userName,
      userPassword,
      userRole,
      userPhone,
      userDepId,
      userDepname,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required to update!" });
    }
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const result = await db.run(
      `
      UPDATE users
      SET userName = ?, userPassword = ?, userRole = ?, userPhone = ?, userDepId = ?, userDepname = ?
      WHERE userId = ?
      `,
      [
        userName,
        userPassword,
        userRole,
        userPhone,
        userDepId,
        userDepname,
        userId,
      ],
    );

    await db.close();

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "User not found. No user was updated." });
    }

    res.status(200).json({
      message: "User updated successfully!",
      updatedUserId: userId,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  createUser,
  deluser,
  updateUser,
};
