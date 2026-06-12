const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Public contact-us form submission. Stored so admin can triage replies.
 * No user reference required — anonymous visitors are expected.
 */
const ContactSubmissionSchema = new Schema(
  {
    fullName: { type: String, trim: true, default: "" },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    countryCode: { type: String, trim: true, default: "+91" },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    interest: {
      type: String,
      trim: true,
      default: "",
    },
    message: { type: String, trim: true, default: "" },
    consent: { type: Boolean, default: false },

    // Admin triage
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "spam"],
      default: "new",
      index: true,
    },
    adminNotes: { type: String, default: "" },

    // Lightweight context for spam/audit
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

ContactSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "ContactSubmission",
  ContactSubmissionSchema,
);
