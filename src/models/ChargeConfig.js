const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Single-document config for cart-level fees. Held as one row keyed by `key`
 * = "default" so admin only ever edits one record.
 *
 * Shipping rule:
 *   - charge `shippingFlat` ₹ if subtotal < `freeShippingThreshold`
 *   - else free
 *   - if `shippingActive` is false, shipping is always 0 (e.g. for promos)
 *
 * Platform fee rule:
 *   - max(platformFeeFlat, subtotal * platformFeePercent / 100)
 *   - applied on (subtotal - couponDiscount) so coupons reduce platform fee too
 *   - if `platformFeeActive` is false, platform fee is 0
 */
const ChargeConfigSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },

    // ----- Shipping -----
    shippingActive: { type: Boolean, default: true },
    shippingFlat: { type: Number, default: 49 },
    freeShippingThreshold: { type: Number, default: 999 },

    // ----- Platform fee -----
    platformFeeActive: { type: Boolean, default: false },
    platformFeeFlat: { type: Number, default: 0 },
    platformFeePercent: { type: Number, default: 0 },

    // ----- Prepaid discount -----
    // When active, prepaid/online orders get `prepaidDiscountPercent`% off the
    // subtotal. COD orders never get it. Admin controls the percentage.
    prepaidDiscountActive: { type: Boolean, default: true },
    prepaidDiscountPercent: { type: Number, default: 2 },

    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChargeConfig", ChargeConfigSchema);
