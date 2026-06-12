const SystemConfig = require("../models/SystemConfig");
const { decryptObject } = require("../util/encryption");

module.exports = () => {
  /**
   * Returns app-facing config keys to the mobile app.
   * Only public keys are returned (not secrets).
   * Called after login so the app has all required API keys.
   */
  const getAppConfig = async (req, res, next) => {
    console.log("AppConfigController => getAppConfig");

    const configs = await SystemConfig.find({ isActive: true });

    const appConfig = {};

    for (const config of configs) {
      const credentialsObj = Object.fromEntries(config.credentials);
      const decrypted = decryptObject(credentialsObj);

      switch (config.configType) {
        case "payment":
          // Only send keyId (public), NOT keySecret
          appConfig.razorpay = {
            keyId: decrypted.keyId,
          };
          break;

        case "google_maps":
          appConfig.googleMaps = {
            apiKey: decrypted.apiKey,
          };
          break;

        case "firebase":
          appConfig.firebase = {
            apiKey: decrypted.apiKey,
            projectId: decrypted.projectId,
            storageBucket: decrypted.storageBucket,
            messagingSenderId: decrypted.messagingSenderId,
            appId: decrypted.appId,
          };
          break;

        // SMS and email configs are backend-only, not sent to app
        default:
          break;
      }
    }

    req.rData = appConfig;
    req.msg = "config_fetched";
    next();
  };

  return {
    getAppConfig,
  };
};
