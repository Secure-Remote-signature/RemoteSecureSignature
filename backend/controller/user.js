import { open } from "sqlite";
import sqlite3 from "sqlite3";
import nodemailer from "nodemailer";
import 'dotenv/config';
import jwt from "jsonwebtoken";
import { getClientIp, writeActivityLog } from "../lib/activityLog.js";

const sqlite3Verbose = sqlite3.verbose();
const JWT_SECRET = String(process.env.JWT_SECRET || "dev-secret-change-me");
const JWT_EXPIRES_IN = String(process.env.JWT_EXPIRES_IN || "8h");

let otpStore = {}; 

function getAuthUser(req) {
  const userId = Number(req.user?.id || 0);
  const role = String(req.user?.role || "").toLowerCase();
  return {
    userId: Number.isInteger(userId) && userId > 0 ? userId : null,
    role,
    isAdmin: role.includes("admin"),
  };
}

async function enforceSelfOrAdmin(db, req, targetUserId) {
  const auth = getAuthUser(req);
  if (!auth.userId) {
    return { allowed: false, code: 401, error: "Unauthorized" };
  }

  if (auth.isAdmin || auth.userId === targetUserId) {
    return { allowed: true, authUserId: auth.userId };
  }

  const actor = await db.get("SELECT userEmail FROM users WHERE userId = ?", [auth.userId]);
  await writeActivityLog(db, {
    actorUserId: auth.userId,
    actorEmail: actor?.userEmail || null,
    action: "FORBIDDEN",
    targetType: "USER",
    targetId: String(targetUserId),
    ipAddress: getClientIp(req),
    status: "FAILED",
    details: `Unauthorized user access attempt to user ${targetUserId}`,
  });

  return { allowed: false, code: 403, error: "Forbidden" };
}

const createUser = async (req, res) => {
  try {
    const { userName, userLastname, userEmail, userPassword, userRole, 
            userPhone, userfacultyId, userPin } = req.body;

    if (!userName || !userLastname || !userEmail || !userPassword 
        || !userRole || !userPhone || !userfacultyId || !userPin) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const userDate = new Date().toISOString();
    const result = await db.run(
      `
      INSERT INTO users (userName, userLastname, userDate, userEmail, userPassword, userRole, userPhone, userfacultyId, userPin, userStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userName,
        userLastname,
        userDate,
        userEmail,
        userPassword,
        userRole,
        userPhone,
        userfacultyId,
        userPin,
        "inactive",
      ],
    );

    await db.close();
    res.status(201).json({ message: "User created successfully!", userId: result.lastID });
  } catch (error) {
    console.error("DEBUG ERROR:", error); // ดู Error ละเอียดใน Terminal
    if (error.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ error: "This email is already registered." });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    console.log("Incoming Login Body:", req.body);
    const { userEmail, userPassword } = req.body;
    if (!userEmail || !userPassword) {
      return res.status(400).json({ error: "Email and password are required!" });
    }
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });
    const user = await db.get(
      `SELECT * FROM users WHERE userEmail = ? AND userPassword = ?`,
      [userEmail, userPassword],
    );

    if (user) {
      const now = new Date().toISOString();
      await db.run(
        `UPDATE users SET userStatus = 'active', lastLoginAt = ?, lastActiveAt = ? WHERE userId = ?`,
        [now, now, user.userId],
      );

      await writeActivityLog(db, {
        eventAt: now,
        actorUserId: user.userId,
        actorEmail: user.userEmail,
        action: "LOGIN",
        targetType: "AUTH",
        targetId: String(user.userId),
        ipAddress: getClientIp(req),
        status: "SUCCESS",
        details: "User logged in via Web",
      });

      await db.close();

      const token = jwt.sign(
        {
          sub: user.userId,
          role: user.userRole,
          email: user.userEmail,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      res.status(200).json({
        message: "Login successful!",
        userId: user.userId,
        name: user.userName,
        lastName: user.userLastname,
        role: user.userRole,
        token,
      });
    } else {
      await writeActivityLog(db, {
        eventAt: new Date().toISOString(),
        actorUserId: null,
        actorEmail: String(userEmail || "").trim() || null,
        action: "LOGIN",
        targetType: "AUTH",
        targetId: "-",
        ipAddress: getClientIp(req),
        status: "FAILED",
        details: "Invalid email or password",
      });
      await db.close();
      res.status(401).json({ error: "Invalid email or password!" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

const logoutUser = async (req, res) => {
  try {
    const requesterId = Number(req.user?.id || 0);

    if (!Number.isInteger(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const now = new Date().toISOString();
    const result = await db.run(
      `UPDATE users SET userStatus = 'inactive', lastActiveAt = ? WHERE userId = ?`,
      [now, requesterId],
    );

    const actor = await db.get("SELECT userEmail FROM users WHERE userId = ?", [requesterId]);
    await writeActivityLog(db, {
      eventAt: now,
      actorUserId: requesterId,
      actorEmail: actor?.userEmail || null,
      action: "LOGOUT",
      targetType: "AUTH",
      targetId: String(requesterId),
      ipAddress: getClientIp(req),
      status: result.changes > 0 ? "SUCCESS" : "FAILED",
      details: result.changes > 0 ? "User logged out" : "Logout failed: user not found",
    });

    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const heartbeatUser = async (req, res) => {
  try {
    const requesterId = Number(req.user?.id || 0);

    if (!Number.isInteger(requesterId) || requesterId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const now = new Date().toISOString();
    const result = await db.run(
      `UPDATE users SET userStatus = 'active', lastActiveAt = ? WHERE userId = ?`,
      [now, requesterId],
    );
    await db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "Heartbeat updated" });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyUserPin = async (req, res) => {
  try {
    const { userId, userPin } = req.body;

    if (!userId || !userPin) {
      return res.status(400).json({ error: "userId and userPin are required" });
    }

    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const user = await db.get(
      "SELECT userPin FROM users WHERE userId = ?",
      [userId]
    );
    await db.close();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (String(user.userPin) !== String(userPin)) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    return res.status(200).json({ message: "PIN verified" });
  } catch (error) {
    console.error("Verify PIN Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
    


const deluser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "User ID is required to delete a user!" });
    }

    const db = await open({
      filename: "./database/remote.db", // Matching the filename you provided
      driver: sqlite3Verbose.Database,
    });

    const permission = await enforceSelfOrAdmin(db, req, userId);
    if (!permission.allowed) {
      await db.close();
      return res.status(permission.code).json({ error: permission.error });
    }

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
      deletedUserId: Number(userId),
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const {
      userName,
      userLastname,
      userPhone,
      userPassword,
    } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "User ID is required to update!" });
    }
    const db = await open({
      filename: "./database/remote.db",
      driver: sqlite3Verbose.Database,
    });

    const permission = await enforceSelfOrAdmin(db, req, userId);
    if (!permission.allowed) {
      await db.close();
      return res.status(permission.code).json({ error: permission.error });
    }

    const beforeUser = await db.get(
      "SELECT userName, userLastname, userPhone, userPassword, userEmail FROM users WHERE userId = ?",
      [userId],
    );

    const result = await db.run(
        `
        UPDATE users
        SET userName = COALESCE(?, userName), 
            userLastname = COALESCE(?, userLastname), 
            userPhone = COALESCE(?, userPhone), 
            userPassword = COALESCE(?, userPassword)
        WHERE userId = ?
        `,
      [
        userName,
        userLastname,
        userPhone,
        userPassword,
        userId,
      ],
    );

    const updatedUser = await db.get(
      "SELECT userEmail FROM users WHERE userId = ?",
      [userId],
    );

    const changedFields = [];
    if (beforeUser) {
      const nextName = userName ?? beforeUser.userName;
      const nextLastname = userLastname ?? beforeUser.userLastname;
      const nextPhone = userPhone ?? beforeUser.userPhone;
      const nextPassword = userPassword ?? beforeUser.userPassword;

      if (String(beforeUser.userName ?? "") !== String(nextName ?? "")) changedFields.push("userName");
      if (String(beforeUser.userLastname ?? "") !== String(nextLastname ?? "")) changedFields.push("userLastname");
      if (String(beforeUser.userPhone ?? "") !== String(nextPhone ?? "")) changedFields.push("userPhone");
      if (String(beforeUser.userPassword ?? "") !== String(nextPassword ?? "")) changedFields.push("userPassword");
    }

    await writeActivityLog(db, {
      actorUserId: Number(userId) || null,
      actorEmail: updatedUser?.userEmail || null,
      action: "ACCOUNT_UPDATE",
      targetType: "USER",
      targetId: String(userId),
      ipAddress: getClientIp(req),
      status: result.changes > 0 ? "SUCCESS" : "FAILED",
      details: result.changes > 0
        ? `Updated user profile${changedFields.length > 0 ? ` (${changedFields.join(", ")})` : ""}`
        : "Update user profile failed",
      metadata: {
        changedFields,
      },
    });

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

const getUserProfile = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const db = await open({ 
      filename: "./database/remote.db", 
      driver: sqlite3Verbose.Database });

    const permission = await enforceSelfOrAdmin(db, req, id);
    if (!permission.allowed) {
      await db.close();
      return res.status(permission.code).json({ error: permission.error });
    }

    const user = await db.get(
      `
      SELECT
        u.*, 
        f.facultyName as userfacultyName
      FROM users u
      LEFT JOIN faculties f ON u.userfacultyId = f.facultyId
      WHERE u.userId = ?
      `,
      [id]
    );
    await db.close();

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { oldPassword, newPassword } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    console.log("Update Request for ID:", id);
    console.log("Body Received:", req.body); 

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "กรุณาส่งข้อมูลให้ครบ (oldPassword, newPassword)" });
    }

    const db = await open({ filename: "./database/remote.db", driver: sqlite3Verbose.Database });

    const permission = await enforceSelfOrAdmin(db, req, id);
    if (!permission.allowed) {
      await db.close();
      return res.status(permission.code).json({ error: permission.error });
    }

    // 1. check old password
    const user = await db.get("SELECT userPassword FROM users WHERE userId = ?", [id]);

    if (!user || user.userPassword !== oldPassword) {
      await db.close();
      return res.status(401).json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    // 2. validate new password
    if (newPassword.trim() === "") {
        await db.close();
        return res.status(400).json({ error: "รหัสผ่านใหม่ต้องไม่เป็นค่าว่าง" });
    }

    // 3. Update
    await db.run(
      "UPDATE users SET userPassword = ? WHERE userId = ?", 
      [newPassword, id]
      );

    const actor = await db.get("SELECT userEmail FROM users WHERE userId = ?", [id]);
    await writeActivityLog(db, {
      actorUserId: Number(id) || null,
      actorEmail: actor?.userEmail || null,
      action: "ACCOUNT_PASSWORD_CHANGE",
      targetType: "USER",
      targetId: String(id),
      ipAddress: getClientIp(req),
      status: "SUCCESS",
      details: "User changed password",
    });

    await db.close();

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Change Pass Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const requestOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = {
            otp: otp,
            expires: Date.now() + 300000 
        };

        await transporter.sendMail({
            from: `"SRS System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP for Password Reset',
            text: `Your OTP is: ${otp}. It will expire in 5 minutes.`
        });
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error("OTP Request Error:", error);
        res.status(500).json({ message: 'Failed to send email' });
    }
};

const verifyOTP = async (req, res) => {
    console.log("--- Debug OTP Verification ---");
    console.log("Body ที่ได้รับ:", req.body); 
    
    const { email, otp, newPassword } = req.body;

    try {
        const storedData = otpStore[email];

        if (!storedData) {
            console.log("❌ ไม่พบการขอ OTP สำหรับอีเมลนี้");
            return res.status(400).json({ error: "Invalid OTP or OTP expired." });
        }
        if (Date.now() > storedData.expires) {
            delete otpStore[email]; // ลบทิ้งถ้าหมดอายุ
            console.log("❌ OTP หมดอายุแล้ว");
            return res.status(400).json({ error: "OTP expired." });
        }
        if (String(storedData.otp) !== String(otp)) {
            console.log("❌ รหัส OTP ไม่ตรงกัน! ในระบบ:", storedData.otp, "ที่ส่งมา:", otp);
            return res.status(400).json({ error: "Invalid OTP." });
        }

        console.log("✅ OTP ถูกต้อง! กำลังอัปเดตรหัสผ่านใหม่ใน Database...");
        const db = await open({
            filename: "./database/remote.db",
            driver: sqlite3Verbose.Database,
        });

        const result = await db.run(
            "UPDATE users SET userPassword = ? WHERE userEmail = ?",
            [newPassword, email]
        );

        await db.close();

        if (result.changes === 0) {
            console.log("❌ ไม่พบ User นี้ในฐานข้อมูลจริง (UPDATE ไม่สำเร็จ)");
            return res.status(404).json({ error: "User not found in database." });
        }
        delete otpStore[email];

        console.log("🎉 อัปเดตรหัสผ่านสำเร็จ!");
        res.status(200).json({ message: "Update password successfully" });

    } catch (error) {
        console.error("🔥 Error ใน verifyOTP:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getFaculties = async (req, res) => {
  try {
    const db = await open({ 
      filename: "./database/remote.db", 
      driver: sqlite3Verbose.Database 
    });

    const faculties = await db.all("SELECT * FROM faculties ORDER BY facultyName ASC");
    
    await db.close();
    res.status(200).json(faculties);
  } catch (error) {
    console.error("Error fetching faculties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllStaff = async (req, res) => {
    try {
    const { clientId } = req.query;
        const db = await open({ 
            filename: "./database/remote.db", 
            driver: sqlite3Verbose.Database 
        });

    let staffs;
    if (clientId) {
      const numericClientId = Number(clientId);
      if (!Number.isInteger(numericClientId) || numericClientId <= 0) {
        await db.close();
        return res.status(400).json({ error: "Invalid clientId" });
      }

      const requester = await db.get(
        "SELECT userfacultyId FROM users WHERE userId = ?",
        [numericClientId]
      );

      if (!requester) {
        await db.close();
        return res.status(404).json({ error: "Requester not found" });
      }

      staffs = await db.all(
        `
        SELECT
          u.userId,
          u.userName,
          u.userLastname,
          u.userEmail,
          u.userPhone,
          u.userRole,
          f.facultyName
        FROM users u
        LEFT JOIN faculties f ON f.facultyId = u.userfacultyId
        WHERE u.userRole IN ('admin', 'staff', 'professor')
          AND u.userfacultyId = ?
          AND u.userId != ?
        ORDER BY u.userName ASC, u.userLastname ASC
        `,
        [requester.userfacultyId, numericClientId]
      );
    } else {
      staffs = await db.all(
        `
        SELECT
          u.userId,
          u.userName,
          u.userLastname,
          u.userEmail,
          u.userPhone,
          u.userRole,
          f.facultyName
        FROM users u
        LEFT JOIN faculties f ON f.facultyId = u.userfacultyId
        WHERE u.userRole IN ('admin', 'staff', 'professor')
        ORDER BY u.userName ASC, u.userLastname ASC
        `
      );
    }
        
        await db.close();
        res.status(200).json(staffs);
    } catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export default {
  createUser,
  loginUser,
  logoutUser,
  heartbeatUser,
  verifyUserPin,
  deluser,
  updateUser,
  getUserProfile,
  changePassword,
  requestOTP,
  verifyOTP,
  getFaculties,
  getAllStaff
};
