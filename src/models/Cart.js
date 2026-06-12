const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },

        productName: { type: String },
        productImage: { type: String },

        size: { type: String, default: "" },
        color: { type: String, default: "" },

        quantity: { type: Number, default: 1, min: 1 },

        unitPrice: { type: Number, required: true },
        discountPrice: { type: Number },

        totalPrice: { type: Number, required: true },

        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Cart Summary
    subtotal: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },

    // Applied Coupon
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, default: 0 },

    grandTotal: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Method to calculate totals
CartSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let itemCount = 0;

  this.items.forEach((item) => {
    const price = item.discountPrice || item.unitPrice;
    item.totalPrice = price * item.quantity;
    subtotal += item.totalPrice;
    itemCount += item.quantity;
  });

  this.subtotal = subtotal;
  this.itemCount = itemCount;
  this.grandTotal = subtotal - this.couponDiscount;

  return this;
};

module.exports = mongoose.model("Cart", CartSchema);
