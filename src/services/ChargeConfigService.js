const ChargeConfig = require("../models/ChargeConfig");

const DEFAULTS = {
  shippingActive: true,
  shippingFlat: 49,
  freeShippingThreshold: 999,
  platformFeeActive: false,
  platformFeeFlat: 0,
  platformFeePercent: 0,
  prepaidDiscountActive: true,
  prepaidDiscountPercent: 2,
};

module.exports = () => {
  const getConfig = async () => {
    let cfg = await ChargeConfig.findOne({ key: "default" }).lean();
    if (!cfg) {
      // Seed the single config row on first read so the admin page has
      // something to render and the cart math has sane defaults.
      const created = await ChargeConfig.create({ key: "default", ...DEFAULTS });
      cfg = created.toObject();
    }
    // Merge defaults so fields added after the row was first created (e.g.
    // prepaidDiscount*) resolve to sane values instead of undefined.
    return { ...DEFAULTS, ...cfg };
  };

  const updateConfig = async (patch, adminId) => {
    const allowed = (({
      shippingActive,
      shippingFlat,
      freeShippingThreshold,
      platformFeeActive,
      platformFeeFlat,
      platformFeePercent,
      prepaidDiscountActive,
      prepaidDiscountPercent,
    }) => ({
      shippingActive,
      shippingFlat,
      freeShippingThreshold,
      platformFeeActive,
      platformFeeFlat,
      platformFeePercent,
      prepaidDiscountActive,
      prepaidDiscountPercent,
    }))(patch);

    // Strip undefined so partial updates don't blank out fields.
    for (const k of Object.keys(allowed)) {
      if (allowed[k] === undefined) delete allowed[k];
    }
    if (adminId) allowed.updatedBy = adminId;

    return ChargeConfig.findOneAndUpdate(
      { key: "default" },
      { $set: allowed, $setOnInsert: { key: "default", ...DEFAULTS } },
      { new: true, upsert: true },
    ).lean();
  };

  /**
   * Compute shipping + platform fee for a given subtotal (after coupon
   * discount is applied). Returns rounded integers.
   */
  const computeCharges = async ({ subtotal = 0, couponDiscount = 0 } = {}) => {
    const cfg = await getConfig();
    const effective = Math.max(0, Number(subtotal) - Number(couponDiscount || 0));

    let shippingCost = 0;
    if (cfg.shippingActive) {
      shippingCost =
        effective >= (cfg.freeShippingThreshold || 0)
          ? 0
          : Math.round(Number(cfg.shippingFlat) || 0);
    }

    let platformFee = 0;
    if (cfg.platformFeeActive) {
      const fromPercent =
        ((Number(cfg.platformFeePercent) || 0) * effective) / 100;
      platformFee = Math.round(
        Math.max(Number(cfg.platformFeeFlat) || 0, fromPercent),
      );
    }

    return { shippingCost, platformFee, config: cfg };
  };

  return { getConfig, updateConfig, computeCharges };
};
