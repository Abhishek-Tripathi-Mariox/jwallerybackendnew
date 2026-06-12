const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    // null/undefined => broadcast to all users
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["order", "promo", "system", "broadcast"],
      default: "system",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    // Optional deep link, e.g. "/orders/abc123" or absolute URL
    link: {
      type: String,
      default: "",
      trim: true,
    },
    // For order notifications, optional pointers
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "UserOrders",
      default: null,
    },
    // Per-user read receipts. For broadcast rows we track which users have read.
    readBy: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    // For direct (userId set) notifications, allow a fast flag too
    isRead: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
