const ChargeConfigService = require("../services/ChargeConfigService");

module.exports = () => {
  const getConfig = async (req, res, next) => {
    console.log("ChargeConfigController => getConfig");
    const cfg = await ChargeConfigService().getConfig();
    req.rData = cfg;
    req.msg = "success";
    next();
  };

  const updateConfig = async (req, res, next) => {
    console.log("ChargeConfigController => updateConfig");
    const adminId = req.admin?.id;
    const cfg = await ChargeConfigService().updateConfig(req.body, adminId);
    req.rData = cfg;
    req.msg = "success";
    next();
  };

  // Public preview for the cart / checkout to read current rule values.
  // No auth so the website can show rules without leaking admin details.
  const getPublicConfig = async (req, res, next) => {
    console.log("ChargeConfigController => getPublicConfig");
    const cfg = await ChargeConfigService().getConfig();
    req.rData = {
      shippingActive: cfg.shippingActive,
      shippingFlat: cfg.shippingFlat,
      freeShippingThreshold: cfg.freeShippingThreshold,
      platformFeeActive: cfg.platformFeeActive,
      platformFeeFlat: cfg.platformFeeFlat,
      platformFeePercent: cfg.platformFeePercent,
      prepaidDiscountActive: cfg.prepaidDiscountActive,
      prepaidDiscountPercent: cfg.prepaidDiscountPercent,
    };
    req.msg = "success";
    next();
  };

  return { getConfig, updateConfig, getPublicConfig };
};
