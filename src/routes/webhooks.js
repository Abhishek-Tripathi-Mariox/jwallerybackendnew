const express = require("express");
const webhookRouter = express.Router();
const WebhookController = require("../controllers/WebhookController");

// No AuthMiddleware — Razorpay can't send a user JWT. Trust is established via
// the HMAC signature check inside the controller instead.
webhookRouter.post("/razorpay", WebhookController().razorpay);

module.exports = webhookRouter;
