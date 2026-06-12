const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CouponSchema = new Schema(
  {
    // ---------- BASIC INFO ----------
    title: {
      type: String,
      required: true, // "Get unlimited 25% discount…"
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "", // small badge (CITINEW)
    },

    // ---------- COUPON CODE ----------
    code: {
      type: String,
      required: true,
      unique: true, // "CITINEW"
    },

    // ---------- DISCOUNT ----------
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true, // percentage = 25%, fixed = ₹100
    },
    discountValue: {
      type: Number,
      required: true, // 25 or 100
    },
    maxDiscountAmount: {
      type: Number, // for percentage caps
      default: null,
    },

    // ---------- VALIDITY ----------
    minOrderValue: {
      type: Number,
      default: 0, // "on orders above ₹299"
    },
    startDate: { type: Date },
    endDate: { type: Date },

    // ---------- USER TARGETING ----------
    applicableFor: {
      type: String,
      enum: ["all", "newUser", "specificUser"],
      default: "all",
    },
    specificUserMobile: {
      type: String, // only if applicableFor = specificUser
      default: "",
    },

    // ---------- ELIGIBILITY (Product/Category Based) ----------
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Products",
      },
    ],
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    subCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],

    // ---------- PAYMENT MODE ----------
    paymentMode: {
      type: String,
      enum: ["online", "cod", "both"],
      default: "both",
    },

    // ---------- STATUS ----------
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", CouponSchema);
