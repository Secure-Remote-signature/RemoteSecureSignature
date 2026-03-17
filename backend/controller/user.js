import { open } from "sqlite";
import sqlite3 from "sqlite3";
import nodemailer from "nodemailer";
import 'dotenv/config';

const sqlite3Verbose = sqlite3.verbose();

let otpStore = {}; 

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
      INSERT INTO users (userName, userLastname, userDate, userEmail, userPassword, userRole, userPhone, userfacultyId, userPin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        userPin
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
    await db.close();

    if (user) {
      res.status(200).json({
        message: "Login successful!",
        userId: user.userId,
        full_name: user.userName,
        role: user.userRole,
        token: "fake-jwt-token",
      });
    } else {
      res.status(401).json({ error: "Invalid email or password!" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
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
      userLastname,
      userPhone,
      userPassword,
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
    const { id } = req.params;
    const db = await open({ 
      filename: "./database/remote.db", 
      driver: sqlite3Verbose.Database });
    
    const user = await db.get(
      "SELECT * FROM users WHERE userId = ?", [id]);
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
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    console.log("Update Request for ID:", id);
    console.log("Body Received:", req.body); 

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "กรุณาส่งข้อมูลให้ครบ (oldPassword, newPassword)" });
    }

    const db = await open({ filename: "./database/remote.db", driver: sqlite3Verbose.Database });

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


export default {
  createUser,
  loginUser,
  deluser,
  updateUser,
  getUserProfile,
  changePassword,
  requestOTP,
  verifyOTP,
  getFaculties,
};
