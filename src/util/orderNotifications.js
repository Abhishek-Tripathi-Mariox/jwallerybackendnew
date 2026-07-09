const User = require("../models/User");
const NotificationService = require("../services/NotificationService");

// Loyalty program — award 1 point per ₹100 spent. Safe to fail silently.
const awardLoyaltyPoints = async (userId, amount) => {
  try {
    const points = Math.floor(Number(amount || 0) / 100);
    if (points > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } });
    }
  } catch (e) {}
};

const safeNotify = async (payload) => {
  try {
    await NotificationService().createForUser(payload);
  } catch (err) {
    console.error("Notification create failed:", err.message);
  }
};

module.exports = { awardLoyaltyPoints, safeNotify };
