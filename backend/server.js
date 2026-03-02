import express from "express";
import initializeDatabase from "./config/init.js"; 
import userService from "./router/user.js"
// import requestService from "./router/request.js";

const app = express();
const port = 5000;

app.use(express.json());
app.use("/srs/user", userService);
// app.use("/srs/request", requestService);

app.get("/srs", (req, res) => {
  res.send("Remote Secure Server is running!");
});


async function startApp() {
  try {
    console.log("Setting up database...");
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startApp();
