import express from "express";
import userController from "../controller/user.js";
const user = express.Router();


user.get("/", (req, res) => {res.send("Hello from User");});
user.post("/createuser", userController.createUser);
user.post("/login", userController.loginUser);
user.delete("/deluser/:id", userController.deluser);
user.put('/updateuser/:id', userController.updateUser);
user.get('/profile/:id', userController.getUserProfile);
user.put('/change-password/:id', userController.changePassword);

export default user;
