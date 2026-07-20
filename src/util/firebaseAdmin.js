const admin = require("firebase-admin");
const crypto = require("crypto");
const SystemConfigService = require("../services/SystemConfigService");

const APP_NAME = "push";
let cachedHash = null;

// Re-initializes the named Firebase app whenever the admin updates the
// stored service-account JSON (detected via a content hash), since
// admin.initializeApp() can't be called twice with the same app name.
const getApp = async () => {
  const raw = await SystemConfigService().getRawConfig("firebase_admin");
  if (!raw || !raw.serviceAccountJson) return null;

  const hash = crypto.createHash("sha256").update(raw.serviceAccountJson).digest("hex");
  const existing = admin.apps.find((a) => a && a.name === APP_NAME);
  if (existing && cachedHash === hash) return existing;
  if (existing) await existing.delete();

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw.serviceAccountJson);
  } catch (error) {
    console.error("Firebase Admin: stored service account JSON is invalid:", error.message);
    return null;
  }

  const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, APP_NAME);
  cachedHash = hash;
  return app;
};

// FCM requires every `data` payload value to be a string.
const stringifyData = (data) => {
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
};

/**
 * Sends a push notification to a single device token. Best-effort — never
 * throws; returns false if Firebase Admin isn't configured or the send
 * fails (e.g. a stale/uninstalled-app token), so callers can fire-and-forget
 * without risking the notification-creation flow that triggered it.
 */
const sendPushToToken = async (token, { title, body, data = {} } = {}) => {
  if (!token) return false;
  try {
    const app = await getApp();
    if (!app) return false;

    await app.messaging().send({
      token,
      notification: { title, body },
      data: stringifyData(data),
    });
    return true;
  } catch (error) {
    console.error("Firebase push send failed:", error.message);
    return false;
  }
};

/**
 * Sends the same push to many device tokens (batched — FCM allows up to 500
 * per multicast call). Best-effort, same as sendPushToToken.
 */
const sendPushToTokens = async (tokens, { title, body, data = {} } = {}) => {
  const list = [...new Set((tokens || []).filter(Boolean))];
  if (list.length === 0) return { successCount: 0, failureCount: 0 };

  const app = await getApp();
  if (!app) return { successCount: 0, failureCount: 0 };

  let successCount = 0;
  let failureCount = 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    try {
      const res = await app.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: stringifyData(data),
      });
      successCount += res.successCount;
      failureCount += res.failureCount;
    } catch (error) {
      console.error("Firebase multicast push send failed:", error.message);
      failureCount += batch.length;
    }
  }
  return { successCount, failureCount };
};

const isConfigured = async () => !!(await getApp());

module.exports = { sendPushToToken, sendPushToTokens, isConfigured };
