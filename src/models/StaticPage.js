const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Lightweight CMS for marketing pages — About Us, Privacy Policy, Terms,
 * Shipping Policy, Returns, Store Locator, etc. One document per slug.
 *
 * `content` is sanitized HTML. Admin pastes formatted text; the website
 * renders it with a Markdown-ish presentation.
 */
const StaticPageSchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: [true, "Title is required"] },
    subtitle: { type: String, default: "" },
    content: { type: String, default: "" }, // HTML or markdown-ish text
    isPublished: { type: Boolean, default: true, index: true },
    seoDescription: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StaticPage", StaticPageSchema);
