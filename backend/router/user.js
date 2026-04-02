import express from "express";
import userController from "../controller/user.js";
import { requireAuth } from "../middleware/auth.js";
const user = express.Router();


user.get("/", (req, res) => {res.send("Hello from User");});
user.post("/createuser", userController.createUser);
user.post("/login", userController.loginUser);
user.post("/logout", requireAuth, userController.logoutUser);
user.post("/heartbeat", requireAuth, userController.heartbeatUser);
user.post("/verify-pin", requireAuth, userController.verifyUserPin);
user.delete("/deluser/:id", requireAuth, userController.deluser);
user.put('/updateuser/:id', requireAuth, userController.updateUser);
user.get('/profile/:id', requireAuth, userController.getUserProfile);
user.put('/change-password/:id', requireAuth, userController.changePassword);
user.post('/request-otp', userController.requestOTP);
user.post('/verify-otp', userController.verifyOTP);
user.post('/reset-pin-with-otp', userController.resetPinWithOtp);
user.put('/change-pin/:id', requireAuth, userController.changePinWithOtp);
user.get('/faculties', userController.getFaculties);
user.get('/staff', userController.getAllStaff);

export default user;
