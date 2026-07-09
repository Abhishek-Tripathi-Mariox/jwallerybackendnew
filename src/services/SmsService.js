const SystemConfig = require("../models/SystemConfig");
const { decryptObject } = require("../util/encryption");

module.exports = () => {
  const resolveMsg91Config = () => {
    const authKey = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || "";
    const templateId =
      process.env.MSG91_TEMPLATE_ID ||
      process.env.MSG91_DLT_TEMPLATE_ID ||
      process.env.DLT_TEMPLATE_ID ||
      "";
    const senderId = process.env.MSG91_SENDER_ID || process.env.MSG91_DLT_SENDER_ID || "";

    return {
      authKey,
      templateId,
      senderId,
    };
  };

  const getSmsConfig = async () => {
    const config = await SystemConfig.findOne({
      configType: "sms",
      isActive: true,
    });

    if (!config) {
      // Fallback to .env MSG91 credentials so OTP works even before an admin
      // configures SMS in the panel.
      const envConfig = resolveMsg91Config();
      if (envConfig.authKey || envConfig.templateId || envConfig.senderId) {
        return {
          provider: "msg91",
          ...envConfig,
        };
      }
      console.log("SMS config not found or inactive");
      return null;
    }

    // Decrypt credentials
    const credentialsObj = Object.fromEntries(config.credentials);
    const decrypted = decryptObject(credentialsObj);

    return {
      provider: config.provider,
      ...decrypted,
    };
  };

  const sendOtp = async (mobileNumber, otp, countryCode = "91") => {
    const config = await getSmsConfig();

    if (!config) {
      console.log("SMS not configured — OTP not sent. OTP:", otp);
      return { success: false, message: "SMS service not configured" };
    }

    if (config.provider === "msg91") {
      return await sendViaMSG91(config, mobileNumber, otp, countryCode);
    }

    console.log("Unknown SMS provider:", config.provider);
    return { success: false, message: "Unknown SMS provider" };
  };

  const sendViaMSG91 = async (config, mobileNumber, otp, countryCode) => {
    try {
      const { authKey, templateId, senderId } = config;

      if (!authKey || !templateId) {
        return {
          success: false,
          message: "MSG91 config incomplete. Please set auth key and approved OTP template id.",
        };
      }

      // MSG91 expects mobile as concatenated digits only (e.g. "919999999999").
      // Callers may pass either "+91" or "91" — strip non-digits before joining.
      const cc = String(countryCode || "91").replace(/\D/g, "");
      const num = String(mobileNumber || "").replace(/\D/g, "");
      const mobile = `${cc}${num}`;

      // MSG91 Send SMS (flow) API — the dedicated /v5/otp endpoint requires a
      // template registered under MSG91's separate "OTP" section, which this
      // account doesn't have. The DLT-verified SMS template works via /v5/flow
      // instead, with the OTP passed positionally as VAR1.
      const url = "https://control.msg91.com/api/v5/flow";

      const payload = {
        template_id: String(templateId),
        short_url: "0",
        recipients: [
          {
            mobiles: mobile,
            VAR1: String(otp || ""),
            OTP: String(otp || ""),
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          authkey: authKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("MSG91 OTP Request:", {
        url,
        mobile,
        sender: senderId,
        template_id: templateId,
      });

      console.log("MSG91 OTP HTTP Status:", response.status);
      console.log("MSG91 OTP Response:", data);

      if (response.ok && data.type === "success") {
        return { success: true, message: "OTP sent successfully" };
      } else {
        return {
          success: false,
          message:
            data.message ||
            data.error ||
            `Failed to send OTP via MSG91 (HTTP ${response.status})`,
          raw: data,
        };
      }
    } catch (error) {
      console.error("MSG91 OTP Error:", error.message);
      return { success: false, message: "Failed to send OTP via MSG91" };
    }
  };

  const verifyViaMSG91 = async (mobileNumber, otp, countryCode = "91") => {
    const config = await getSmsConfig();

    if (!config || config.provider !== "msg91") {
      return { success: false, message: "MSG91 not configured" };
    }

    try {
      const { authKey } = config;
      const mobile = `${String(countryCode || "91").replace(/\D/g, "")}${String(
        mobileNumber || ""
      ).replace(/\D/g, "")}`;
      const url = `https://control.msg91.com/api/v5/otp/verify?mobile=${encodeURIComponent(
        mobile
      )}&otp=${encodeURIComponent(String(otp || ""))}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          authkey: authKey,
        },
      });

      const data = await response.json();
      console.log("MSG91 Verify Response:", data);

      return {
        success: response.ok && data.type === "success",
        message: data.message || "Verification result",
      };
    } catch (error) {
      console.error("MSG91 Verify Error:", error.message);
      return { success: false, message: "Failed to verify OTP via MSG91" };
    }
  };

  return {
    sendOtp,
    getSmsConfig,
    verifyViaMSG91,
  };
};
