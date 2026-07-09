const SystemConfigService = require("../services/SystemConfigService");
const SmsService = require("../services/SmsService");
const helpers = require("../util/helpers.js");

module.exports = () => {
  const getSmsConfig = async (req, res, next) => {
    console.log("SystemConfigController => getSmsConfig");

    const config = await SystemConfigService().getConfig("sms");

    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const getEmailConfig = async (req, res, next) => {
    console.log("SystemConfigController => getEmailConfig");

    const config = await SystemConfigService().getConfig("email");

    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const saveSmsConfig = async (req, res, next) => {
    console.log("SystemConfigController => saveSmsConfig");
    const { provider, authKey, templateId, senderId } = req.body;
    const adminId = req.admin.id;

    if (!provider || !authKey || !templateId || !senderId) {
      req.statusCode = 400;
      throw new Error("All SMS configuration fields are required");
    }

    const credentials = { authKey, templateId, senderId };

    await SystemConfigService().upsertConfig("sms", provider, credentials, adminId);

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const saveEmailConfig = async (req, res, next) => {
    console.log("SystemConfigController => saveEmailConfig");
    const { provider, host, port, username, password } = req.body;
    const adminId = req.admin.id;

    if (!provider || !host || !port || !username || !password) {
      req.statusCode = 400;
      throw new Error("All email configuration fields are required");
    }

    const credentials = { host, port: String(port), username, password };

    await SystemConfigService().upsertConfig("email", provider, credentials, adminId);

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const toggleSmsStatus = async (req, res, next) => {
    console.log("SystemConfigController => toggleSmsStatus");

    const config = await SystemConfigService().toggleStatus("sms");

    if (!config) {
      req.statusCode = 404;
      throw new Error("SMS configuration not found");
    }

    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  const toggleEmailStatus = async (req, res, next) => {
    console.log("SystemConfigController => toggleEmailStatus");

    const config = await SystemConfigService().toggleStatus("email");

    if (!config) {
      req.statusCode = 404;
      throw new Error("Email configuration not found");
    }

    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  const testSms = async (req, res, next) => {
    console.log("SystemConfigController => testSms");
    const { mobileNumber, countryCode = "91" } = req.body;

    if (!mobileNumber) {
      req.statusCode = 400;
      throw new Error("Mobile number is required");
    }

    const testOtp = helpers().generateOTP();
    const result = await SmsService().sendOtp(mobileNumber, testOtp, countryCode);

    req.rData = result;
    req.msg = result.success ? "sms_sent" : "sms_failed";
    next();
  };

  const getPaymentConfig = async (req, res, next) => {
    console.log("SystemConfigController => getPaymentConfig");

    const config = await SystemConfigService().getConfig("payment");

    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const savePaymentConfig = async (req, res, next) => {
    console.log("SystemConfigController => savePaymentConfig");
    const { provider, keyId, keySecret } = req.body;
    const adminId = req.admin.id;

    if (!provider || !keyId || !keySecret) {
      req.statusCode = 400;
      throw new Error("All payment configuration fields are required");
    }

    const credentials = { keyId, keySecret };

    await SystemConfigService().upsertConfig("payment", provider, credentials, adminId);

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const togglePaymentStatus = async (req, res, next) => {
    console.log("SystemConfigController => togglePaymentStatus");

    const config = await SystemConfigService().toggleStatus("payment");

    if (!config) {
      req.statusCode = 404;
      throw new Error("Payment configuration not found");
    }

    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  const getGoogleMapsConfig = async (req, res, next) => {
    console.log("SystemConfigController => getGoogleMapsConfig");
    const config = await SystemConfigService().getConfig("google_maps");
    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const saveGoogleMapsConfig = async (req, res, next) => {
    console.log("SystemConfigController => saveGoogleMapsConfig");
    const { provider, apiKey } = req.body;
    const adminId = req.admin.id;

    if (!apiKey) {
      req.statusCode = 400;
      throw new Error("Google Maps API Key is required");
    }

    const credentials = { apiKey };
    await SystemConfigService().upsertConfig("google_maps", provider || "google", credentials, adminId);

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const toggleGoogleMapsStatus = async (req, res, next) => {
    const config = await SystemConfigService().toggleStatus("google_maps");
    if (!config) {
      req.statusCode = 404;
      throw new Error("Google Maps configuration not found");
    }
    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  const getFirebaseConfig = async (req, res, next) => {
    console.log("SystemConfigController => getFirebaseConfig");
    const config = await SystemConfigService().getConfig("firebase");
    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const saveFirebaseConfig = async (req, res, next) => {
    console.log("SystemConfigController => saveFirebaseConfig");
    const { provider, apiKey, projectId, storageBucket, messagingSenderId, appId } = req.body;
    const adminId = req.admin.id;

    if (!apiKey || !projectId || !appId) {
      req.statusCode = 400;
      throw new Error("API Key, Project ID, and App ID are required");
    }

    const credentials = {
      apiKey,
      projectId,
      storageBucket: storageBucket || "",
      messagingSenderId: messagingSenderId || "",
      appId,
    };

    await SystemConfigService().upsertConfig("firebase", provider || "firebase", credentials, adminId);

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const toggleFirebaseStatus = async (req, res, next) => {
    const config = await SystemConfigService().toggleStatus("firebase");
    if (!config) {
      req.statusCode = 404;
      throw new Error("Firebase configuration not found");
    }
    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  // Support Contact Info Config
  const getSupportConfig = async (req, res, next) => {
    console.log("SystemConfigController => getSupportConfig");
    const config = await SystemConfigService().getSupportConfig();
    req.rData = config;
    req.msg = config ? "config_fetched" : "no_config";
    next();
  };

  const saveSupportConfig = async (req, res, next) => {
    console.log("SystemConfigController => saveSupportConfig");
    const {
      phone,
      email,
      whatsapp,
      address,
      workingHours,
      chatBotMessages,
    } = req.body;
    const adminId = req.admin.id;

    const credentials = {
      phone: phone || "",
      email: email || "",
      whatsapp: whatsapp || "",
      address: address || "",
      workingHours: workingHours || "9:00 AM - 6:00 PM",
      chatBotMessages: JSON.stringify(chatBotMessages || []),
    };

    await SystemConfigService().upsertSupportConfig(
      "contact",
      credentials,
      adminId,
    );

    req.rData = null;
    req.msg = "config_saved";
    next();
  };

  const toggleSupportStatus = async (req, res, next) => {
    const config = await SystemConfigService().toggleStatus("support");
    if (!config) {
      req.statusCode = 404;
      throw new Error("Support configuration not found");
    }
    req.rData = { isActive: config.isActive };
    req.msg = "status_updated";
    next();
  };

  return {
    getSmsConfig,
    getEmailConfig,
    saveSmsConfig,
    saveEmailConfig,
    toggleSmsStatus,
    toggleEmailStatus,
    testSms,
    getPaymentConfig,
    savePaymentConfig,
    togglePaymentStatus,
    getGoogleMapsConfig,
    saveGoogleMapsConfig,
    toggleGoogleMapsStatus,
    getFirebaseConfig,
    saveFirebaseConfig,
    toggleFirebaseStatus,
    getSupportConfig,
    saveSupportConfig,
    toggleSupportStatus,
  };
};
