const fs = require("fs");
const path = require("path");

// One file per calendar day — logs/razorpay-YYYY-MM-DD.log. The whole logs/
// directory is gitignored; this only writes locally/on the server, never
// committed.
const LOG_DIR = path.join(__dirname, "..", "..", "logs");

const todayFile = () => {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return path.join(LOG_DIR, `razorpay-${stamp}.log`);
};

/**
 * Appends one JSON line per Razorpay-related event (order creation, payment
 * verification, webhook delivery, refunds) — a persistent audit trail
 * independent of wherever console.log ends up (pm2 log rotation, stdout
 * buffering, etc.). Best-effort: a logging failure must never break the
 * actual payment flow, so this only ever logs-and-swallows its own errors.
 */
const logRazorpay = (event, data = {}) => {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ time: new Date().toISOString(), event, ...data }) + "\n";
    fs.appendFileSync(todayFile(), line);
  } catch (error) {
    console.error("Failed to write Razorpay log:", error.message);
  }
};

module.exports = { logRazorpay };
