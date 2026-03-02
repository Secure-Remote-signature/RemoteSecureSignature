import express from "express";
import userController from "../controller/user.js";
const user = express.Router();


user.get("/", (req, res) => {res.send("Hello from User");});
user.post("/createuser", userController.createUser);
export default user;
