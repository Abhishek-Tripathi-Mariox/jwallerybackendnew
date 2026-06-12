const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SellerSchema = new Schema(
  {
    // ---------------- AUTH DETAILS ----------------
    mobile: { type: String, required: true, index: true, unique: true },
    otp: { type: String },
    otpExpiry: { type: Date },
    isMobileVerified: { type: Boolean, default: false },

    // ---------------- BASIC PROFILE ----------------
    fullName: { type: String, default: "" },
    email: { type: String, default: "" },
    ownerImage: { type: String, default: "" },

    // ---------------- SHOP DETAILS ----------------
    shopName: { type: String, default: "" },
    shopDescription: { type: String, default: "" },

    shopImages: [
      {
        url: String,
      },
    ],

    shopLogo: { type: String, default: "" },

    businessType: { type: String, default: "" }, // Fashion, Grocery, Shoes etc.

    // ---------------- CATEGORY ASSIGNMENT ----------------
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // ---------------- ADDRESS ----------------
    address: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },

    lat: { type: Number }, // Google Maps
    lng: { type: Number },

    // ---------------- GST & KYC ----------------
    gstNumber: { type: String, default: "" },
    gstVerified: { type: Boolean, default: false },
    gstCertificate: { type: String, default: "" },

    aadhaarNumber: { type: String, default: "" },
    panNumber: { type: String, default: "" },

    aadhaarImage: { type: String, default: "" },
    panImage: { type: String, default: "" },

    // ---------------- BANK DETAILS ----------------
    bankDetails: {
      accountHolder: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      bankName: { type: String, default: "" },
      upi: { type: String, default: "" },
      upiVerified: { type: Boolean, default: false },
    },

    // ---------------- SHOP TIMING ----------------
    openingTime: { type: String, default: "" },
    closingTime: { type: String, default: "" },
    weeklyOff: { type: String, default: "" },

    // ---------------- STATUS & FLAGS ----------------
    status: {
      type: String,
      enum: ["pending_profile", "pending_approval", "approved", "rejected"],
      default: "pending_profile",
    },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    // ---------------- APPROVAL AUDIT ----------------
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seller", SellerSchema);
