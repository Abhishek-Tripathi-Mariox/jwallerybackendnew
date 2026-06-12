const SystemConfig = require("../models/SystemConfig");
const { decryptObject } = require("../util/encryption");

module.exports = () => {
  const getSmsConfig = async () => {
    const config = await SystemConfig.findOne({
      configType: "sms",
      isActive: true,
    });

    if (!config) {
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

      // MSG91 expects mobile as concatenated digits only (e.g. "919999999999").
      // Callers may pass either "+91" or "91" — strip non-digits before joining.
      const cc = String(countryCode || "91").replace(/\D/g, "");
      const num = String(mobileNumber || "").replace(/\D/g, "");
      const mobile = `${cc}${num}`;

      // MSG91 Send OTP API
      const url = `https://control.msg91.com/api/v5/otp`;

      const payload = {
        template_id: templateId,
        mobile,
        sender: senderId,
        otp: otp,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("MSG91 OTP Request:", { mobile, sender: senderId, template_id: templateId });
      console.log("MSG91 OTP Response:", data);

      if (data.type === "success") {
        return { success: true, message: "OTP sent successfully" };
      } else {
        return {
          success: false,
          message: data.message || "Failed to send OTP",
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
      const url = `https://control.msg91.com/api/v5/otp/verify?mobile=${countryCode}${mobileNumber}&otp=${otp}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          authkey: authKey,
        },
      });

      const data = await response.json();
      console.log("MSG91 Verify Response:", data);

      return {
        success: data.type === "success",
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
