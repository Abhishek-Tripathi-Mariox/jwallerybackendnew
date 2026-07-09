const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserOrdersSchema = new Schema(
  {
    // ---------------- USER & ADDRESS ----------------
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    addressId: {
      type: Schema.Types.ObjectId,
      ref: "UserAddress",
      required: true,
    },

    // ---------------- ORDER ITEMS ----------------
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Products",
        },

        sellerId: {
          type: Schema.Types.ObjectId,
          ref: "Seller",
        },

        productName: { type: String },
        productImage: { type: String },

        size: { type: String }, // S / M / L from UI
        color: { type: String }, // Cream / Black etc.

        quantity: { type: Number, required: true },

        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },

        discount: { type: Number, default: 0 }, // per item
      },
    ],

    // ---------------- ORDER IDENTIFIERS ----------------
    orderId: { type: String, required: true, unique: true },

    // ---------------- PRICE SUMMARY ----------------
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    prepaidDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    // ---------------- COUPON ----------------
    couponCodeId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    // ---------------- PAYMENT ----------------
    paymentMode: {
      type: String,
      enum: ["cod", "online"],
      default: "cod",
    },

    // ---------------- ORDER STATUS ----------------
    status: {
      type: Number,
      enum: [
        1, // Order Received
        2, // Ready to Ship
        3, // On the Way (Track Order)
        4, // Delivered (Order Again)
        5, // Cancelled
      ],
      default: 1,
    },

    // ---------------- PAYMENT STATUS ----------------
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // ---------------- RAZORPAY ----------------
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    paidAt: { type: Date },

    // ---------------- REFUND ----------------
    refundId: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ["none", "initiated", "processed", "failed"],
      default: "none",
    },
    refundedAt: { type: Date },

    // ---------------- TIMINGS ----------------
    deliveryDate: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: "" },

    // ---------------- ESTIMATED DELIVERY ----------------
    estimatedDelivery: { type: Date },

    // ---------------- FLAGS ----------------
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index for faster queries
UserOrdersSchema.index({ userId: 1, status: 1 });
UserOrdersSchema.index({ orderId: 1 });

module.exports = mongoose.model("UserOrders", UserOrdersSchema);
