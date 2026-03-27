import express from "express";
import userController from "../controller/user.js";
const user = express.Router();


user.get("/", (req, res) => {res.send("Hello from User");});
user.post("/createuser", userController.createUser);
user.post("/login", userController.loginUser);
user.post("/logout", userController.logoutUser);
user.post("/verify-pin", userController.verifyUserPin);
user.delete("/deluser/:id", userController.deluser);
user.put('/updateuser/:id', userController.updateUser);
user.get('/profile/:id', userController.getUserProfile);
user.put('/change-password/:id', userController.changePassword);
user.post('/request-otp', userController.requestOTP);
user.post('/verify-otp', userController.verifyOTP);
user.get('/faculties', userController.getFaculties);
user.get('/staff', userController.getAllStaff);

export default user;
