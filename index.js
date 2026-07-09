const express = require("express");
require("dotenv").config();
require("./src/models"); // Establish MongoDB connection
const PORT = process.env.PORT || 9110;
const app = express();
// `verify` stashes the raw request bytes on req.rawBody, needed by the
// Razorpay webhook route to check the x-razorpay-signature HMAC (which is
// computed over the exact raw payload, not the re-serialized parsed object).
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

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
