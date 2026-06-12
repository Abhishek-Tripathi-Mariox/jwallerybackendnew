const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Admin-curated Instagram reels shown in the "Instagram Reels" section on the
// website home page. Each reel is a piece of media (image or short video)
// uploaded by the admin that links out to the matching reel on instagram.com.
const ReelsSchema = new Schema(
  {
    title: { type: String, default: "" }, // optional caption shown on the card
    mediaUrl: { type: String, required: [true, "media require!"] }, // S3 URL
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    thumbnailUrl: { type: String, default: "" }, // optional poster for videos
    instagramUrl: { type: String, required: [true, "instagram url require!"] },
    rank: { type: Number, default: 0 }, // manual display order
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reels", ReelsSchema);
