const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Products",
      required: true,
    },

    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
    },

    // Optional for easy rendering
    productName: { type: String },
    productImage: { type: String },
    price: { type: Number },
    discountPrice: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", WishlistSchema);
