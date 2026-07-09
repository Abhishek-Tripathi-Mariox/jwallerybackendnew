const UserOrders = require("../models/UserOrders");
const Products = require("../models/Product");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Generate unique order ID
   */
  const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${timestamp}${random}`;
  };

  /**
   * Create a new order
   */
  const createOrder = async (orderData) => {
    const orderId = generateOrderId();

    const order = await UserOrders.create({
      ...orderData,
      orderId,
    });

    // Reduce stock for each product
    for (const item of orderData.products) {
      await Products.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    return order;
  };

  /**
   * Get order by ID
   */
  const getOrderById = (id) => {
    return new Promise((resolve, reject) => {
      UserOrders.findById(id)
        .populate("userId", "fullName mobileNumber email")
        .populate("addressId")
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get order by order ID string
   */
  const getOrderByOrderId = (orderId) => {
    return new Promise((resolve, reject) => {
      UserOrders.findOne({ orderId })
        .populate("userId", "fullName mobileNumber email")
        .populate("addressId")
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get user's orders with filters
   * status: 1=Received, 2=Ready to Ship, 3=On the Way, 4=Delivered, 5=Cancelled
   */
  const getUserOrders = (userId, statusFilter, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    let query = {
      userId: new ObjectId(userId),
      isDeleted: { $ne: true },
    };

    // Filter by status type
    if (statusFilter === "ongoing") {
      query.status = { $in: [1, 2, 3] }; // Received, Ready to Ship, On the Way
    } else if (statusFilter === "complete") {
      query.status = 4; // Delivered
    } else if (statusFilter === "cancelled") {
      query.status = 5; // Cancelled
    }

    return new Promise((resolve, reject) => {
      UserOrders.find(query)
        .populate("addressId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Count user's orders
   */
  const countUserOrders = (userId, statusFilter) => {
    let query = {
      userId: new ObjectId(userId),
      isDeleted: { $ne: true },
    };

    if (statusFilter === "ongoing") {
      query.status = { $in: [1, 2, 3] };
    } else if (statusFilter === "complete") {
      query.status = 4;
    } else if (statusFilter === "cancelled") {
      query.status = 5;
    }

    return new Promise((resolve, reject) => {
      UserOrders.countDocuments(query).then(resolve).catch(reject);
    });
  };

  /**
   * Update order status
   */
  const updateOrderStatus = (orderId, status, additionalData = {}) => {
    const updateData = { status, ...additionalData };

    if (status === 4) {
      updateData.deliveredAt = new Date();
    }

    return new Promise((resolve, reject) => {
      UserOrders.findByIdAndUpdate(orderId, updateData, { new: true })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Cancel order
   */
  const cancelOrder = async (orderId, userId, reason = "") => {
    const order = await UserOrders.findOne({
      _id: new ObjectId(orderId),
      userId: new ObjectId(userId),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status >= 3) {
      throw new Error("Order cannot be cancelled at this stage");
    }

    // Restore stock
    for (const item of order.products) {
      await Products.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = 5;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    await order.save();

    return order;
  };

  /**
   * Atomically flip an order from "not paid" to "paid". The paymentStatus:{$ne:"paid"}
   * guard makes this safe to call twice for the same order (client verify call racing
   * the Razorpay webhook, or a client retry) — the second call is a no-op and returns
   * null, so callers know not to re-award loyalty points / re-notify.
   */
  const markOrderPaid = (filter, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    return UserOrders.findOneAndUpdate(
      { ...filter, paymentStatus: { $ne: "paid" } },
      {
        paymentStatus: "paid",
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: razorpaySignature || "",
        paidAt: new Date(),
      },
      { new: true },
    );
  };

  /**
   * Mark a still-pending order's payment as failed. Only transitions from
   * "pending" so it can never clobber an order a later/earlier event already
   * marked paid (Razorpay can fire failed for an abandoned retry attempt).
   */
  const markOrderPaymentFailed = (razorpayOrderId) => {
    return UserOrders.findOneAndUpdate(
      { razorpayOrderId, paymentStatus: "pending" },
      { paymentStatus: "failed" },
      { new: true },
    );
  };

  /**
   * Record a refund's outcome on the order. Only flips paymentStatus to
   * "refunded" once Razorpay reports the refund as fully processed.
   */
  const recordRefund = (orderId, { refundId, amount, status }) => {
    return UserOrders.findByIdAndUpdate(
      orderId,
      {
        refundId: refundId || "",
        refundAmount: amount,
        refundStatus: status,
        ...(status === "processed"
          ? { refundedAt: new Date(), paymentStatus: "refunded" }
          : {}),
      },
      { new: true },
    );
  };

  /**
   * Get orders for admin (all orders)
   */
  const getAllOrders = (query = {}, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      UserOrders.find({ ...query, isDeleted: { $ne: true } })
        .populate("userId", "fullName mobileNumber email")
        .populate("addressId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Check if user can review a product (order must be delivered)
   */
  const canReviewProduct = async (userId, productId) => {
    const order = await UserOrders.findOne({
      userId: new ObjectId(userId),
      "products.productId": new ObjectId(productId),
      status: 4, // Delivered
    });

    return !!order;
  };

  /**
   * Get order containing specific product for review
   */
  const getDeliveredOrderWithProduct = (userId, productId) => {
    return new Promise((resolve, reject) => {
      UserOrders.findOne({
        userId: new ObjectId(userId),
        "products.productId": new ObjectId(productId),
        status: 4,
      })
        .then(resolve)
        .catch(reject);
    });
  };

  return {
    generateOrderId,
    createOrder,
    getOrderById,
    getOrderByOrderId,
    getUserOrders,
    countUserOrders,
    updateOrderStatus,
    cancelOrder,
    markOrderPaid,
    markOrderPaymentFailed,
    recordRefund,
    getAllOrders,
    canReviewProduct,
    getDeliveredOrderWithProduct,
  };
};
