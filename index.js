const express = require("express");
require("dotenv").config();
require("./src/models"); // Establish MongoDB connection
const PORT = process.env.PORT || 9110;
const app = express();
app.use(express.json());

// ✅ Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

const cors = require("cors");

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization,x-user-data",
  })
);

const fileUpload = require("express-fileupload");
app.use(
  fileUpload({
    limits: { fileSize: 100000000 },
  })
);

// Mount all routes
app.use("/v1/api", require("./src/routes"));

// Health route
app.use("/", (req, res) => {
  res.send("Hello from main");
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log("service listening on port " + PORT);
});
