const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Admin-curated customer testimonials shown in the "Customer View" section on
// the website home page. Distinct from product reviews (RatingService), which
// are tied to delivered orders.
const CustomerReviewsSchema = new Schema(
  {
    name: { type: String, required: [true, "name require!"] },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    reviewText: { type: String, required: [true, "review text require!"] },
    avatar: { type: String, default: "" }, // optional photo URL
    rank: { type: Number, default: 0 }, // manual display order
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerReviews", CustomerReviewsSchema);
