const SystemConfig = require("../models/SystemConfig");
const { encryptObject, decryptObject } = require("../util/encryption");

module.exports = () => {
  const getConfig = async (configType) => {
    const config = await SystemConfig.findOne({ configType });
    if (!config) return null;

    // Decrypt credentials for display (mask sensitive values)
    const credentialsObj = Object.fromEntries(config.credentials);
    const decrypted = decryptObject(credentialsObj);

    // Mask credentials for API response
    const masked = {};
    for (const [key, value] of Object.entries(decrypted)) {
      if (value.length > 6) {
        masked[key] = value.substring(0, 4) + "****" + value.substring(value.length - 2);
      } else {
        masked[key] = "****";
      }
    }

    return {
      _id: config._id,
      configType: config.configType,
      provider: config.provider,
      credentials: masked,
      isActive: config.isActive,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };
  };

  // Unmasked credentials for internal server use only (e.g. initializing an
  // SDK with a private key) — never return this from a controller/API response.
  const getRawConfig = async (configType) => {
    const config = await SystemConfig.findOne({ configType });
    if (!config || !config.isActive) return null;

    const credentialsObj = Object.fromEntries(config.credentials);
    return decryptObject(credentialsObj);
  };

  const upsertConfig = async (configType, provider, credentials, adminId) => {
    // Encrypt all credential values
    const encryptedCredentials = encryptObject(credentials);

    const config = await SystemConfig.findOneAndUpdate(
      { configType },
      {
        configType,
        provider,
        credentials: encryptedCredentials,
        updatedBy: adminId,
      },
      { upsert: true, new: true },
    );

    return config;
  };

  const toggleStatus = async (configType) => {
    const config = await SystemConfig.findOne({ configType });
    if (!config) return null;

    config.isActive = !config.isActive;
    await config.save();
    return config;
  };

  const testSmsConfig = async (configType) => {
    const config = await SystemConfig.findOne({
      configType,
      isActive: true,
    });
    return !!config;
  };

  // Support config doesn't need encryption/masking - it's public contact info
  const getSupportConfig = async () => {
    const config = await SystemConfig.findOne({ configType: "support" });
    if (!config) return null;

    const credentialsObj = Object.fromEntries(config.credentials);

    return {
      _id: config._id,
      configType: config.configType,
      provider: config.provider,
      credentials: credentialsObj,
      isActive: config.isActive,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };
  };

  const upsertSupportConfig = async (provider, credentials, adminId) => {
    // Support config doesn't need encryption - it's public contact info
    const config = await SystemConfig.findOneAndUpdate(
      { configType: "support" },
      {
        configType: "support",
        provider,
        credentials: credentials,
        updatedBy: adminId,
      },
      { upsert: true, new: true },
    );

    return config;
  };

  return {
    getConfig,
    getRawConfig,
    upsertConfig,
    toggleStatus,
    testSmsConfig,
    getSupportConfig,
    upsertSupportConfig,
  };
};
