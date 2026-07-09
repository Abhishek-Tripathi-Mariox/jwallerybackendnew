const OrderService = require("../services/OrderService");
const CartService = require("../services/CartService");
const RazorpayService = require("../services/RazorpayService");
const UserAddressService = require("../services/UserAddressService");
const ChargeConfigService = require("../services/ChargeConfigService");
const { awardLoyaltyPoints, safeNotify } = require("../util/orderNotifications");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Place a new order
   */
  const placeOrder = async (req, res, next) => {
    console.log("OrderController => placeOrder");

    const { userId, addressId, paymentMode } = req.body;

    // Get user's cart
    const cart = await CartService().getCart(userId);

    if (!cart || cart.items.length === 0) {
      req.rCode = 0;
      req.msg = "cart_empty";
      return next();
    }

    // Validate address
    const address = await UserAddressService().fetch(addressId);
    if (!address) {
      req.rCode = 0;
      req.msg = "invalid_address";
      return next();
    }

    // Prepare order products
    const products = cart.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.discountPrice || item.unitPrice,
      totalPrice: item.totalPrice,
      discount: item.unitPrice - (item.discountPrice || item.unitPrice),
    }));

    // Shipping + platform fee are computed from the admin-managed ChargeConfig
    // so a single admin-side edit propagates everywhere.
    const { shippingCost, platformFee, config } = await ChargeConfigService().computeCharges({
      subtotal: cart.subtotal,
      couponDiscount: cart.couponDiscount || 0,
    });

    // Prepaid (online) orders get an admin-configured % off the subtotal.
    const prepaidDiscount =
      paymentMode === "online" && config?.prepaidDiscountActive
        ? Math.round((cart.subtotal * (Number(config.prepaidDiscountPercent) || 0)) / 100)
        : 0;

    const grandTotal =
      (cart.grandTotal || cart.subtotal - (cart.couponDiscount || 0)) +
      shippingCost +
      platformFee -
      prepaidDiscount;

    const orderData = {
      userId: new ObjectId(userId),
      addressId: new ObjectId(addressId),
      products,
      subtotal: cart.subtotal,
      shippingCost,
      platformFee,
      couponDiscount: cart.couponDiscount || 0,
      prepaidDiscount,
      grandTotal,
      couponCodeId: cart.couponId || null,
      paymentMode: paymentMode || "cod",
      status: 1, // Order Received
      paymentStatus: paymentMode === "cod" ? "pending" : "pending",
    };

    // If online payment, create Razorpay order first
    if (paymentMode === "online") {
      const razorpayOrder = await RazorpayService().createOrder(
        orderData.grandTotal,
        "INR",
      );

      if (!razorpayOrder.success) {
        req.rCode = 0;
        req.msg = "payment_init_failed";
        return next();
      }

      // Create order with pending payment
      orderData.razorpayOrderId = razorpayOrder.orderId;
      orderData.paymentStatus = "pending";

      const order = await OrderService().createOrder(orderData);

      // Clear cart
      await CartService().clearCart(userId);

      req.rData = {
        order,
        razorpay: {
          orderId: razorpayOrder.orderId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: await RazorpayService().getKeyId(),
        },
      };
      req.msg = "order_created";
    } else {
      // COD order
      const order = await OrderService().createOrder(orderData);

      // Clear cart
      await CartService().clearCart(userId);

      // Award loyalty points for the purchase
      await awardLoyaltyPoints(userId, order.grandTotal);

      await safeNotify({
        userId,
        type: "order",
        title: "Order placed",
        message: `Your order #${order.orderId || order._id} has been received. Total ₹${order.grandTotal}.`,
        link: `/orders`,
        orderId: order._id,
      });

      req.rData = { order };
      req.msg = "order_placed";
    }

    next();
  };

  /**
   * Verify Razorpay payment
   */
  const verifyPayment = async (req, res, next) => {
    console.log("OrderController => verifyPayment");

    const {
      userId,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Verify signature
    const verification = await RazorpayService().verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!verification.success) {
      req.rCode = 0;
      req.msg = "payment_verification_failed";
      return next();
    }

    // Atomically flip pending -> paid. Returns null if the order was already
    // marked paid (e.g. the webhook beat us to it, or this call is a retry) —
    // in that case we don't re-award loyalty points or send a duplicate notification.
    const updatedOrder = await OrderService().markOrderPaid(
      { _id: orderId },
      { razorpayOrderId, razorpayPaymentId, razorpaySignature },
    );

    if (updatedOrder) {
      await awardLoyaltyPoints(userId, updatedOrder.grandTotal);

      await safeNotify({
        userId,
        type: "order",
        title: "Payment received",
        message: `We've received your payment for order #${updatedOrder.orderId || orderId}.`,
        link: `/orders`,
        orderId,
      });
    }

    req.rData = {};
    req.msg = "payment_verified";
    next();
  };

  /**
   * Get user's orders
   */
  const getOrders = async (req, res, next) => {
    console.log("OrderController => getOrders");

    const { userId } = req.body;
    let { status, page, limit } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    // status can be: 'ongoing', 'complete', 'cancelled', or undefined for all
    const orders = await OrderService().getUserOrders(
      userId,
      status,
      page,
      limit,
    );
    const total = await OrderService().countUserOrders(userId, status);

    req.rData = {
      page,
      limit,
      total,
      orders,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get order details
   */
  const getOrderDetails = async (req, res, next) => {
    console.log("OrderController => getOrderDetails");

    const { id } = req.params;
    const { userId } = req.body;

    const order = await OrderService().getOrderById(id);

    if (!order) {
      req.rCode = 5;
      req.msg = "order_not_found";
      return next();
    }

    // Verify order belongs to user
    if (order.userId._id.toString() !== userId.toString()) {
      req.rCode = 4;
      req.msg = "unauthorized";
      return next();
    }

    req.rData = order;
    req.msg = "success";
    next();
  };

  /**
   * Cancel order
   */
  const cancelOrder = async (req, res, next) => {
    console.log("OrderController => cancelOrder");

    const { userId, reason } = req.body;
    const { id } = req.params;

    try {
      let order = await OrderService().cancelOrder(id, userId, reason);

      // If payment was made, initiate refund and track its outcome on the order
      if (order.paymentStatus === "paid" && order.razorpayPaymentId) {
        const refund = await RazorpayService().refundPayment(
          order.razorpayPaymentId,
          order.grandTotal,
        );

        order = await OrderService().recordRefund(order._id, {
          refundId: refund.success ? refund.refund.id : "",
          amount: order.grandTotal,
          status: refund.success
            ? refund.refund.status === "processed"
              ? "processed"
              : "initiated"
            : "failed",
        });

        if (!refund.success) {
          console.error(
            `Refund failed for order ${id} (payment ${order.razorpayPaymentId}):`,
            refund.error,
          );
        }
      }

      req.rData = order;
      req.msg = "order_cancelled";
    } catch (error) {
      req.rCode = 0;
      req.msg = error.message;
    }

    next();
  };

  /**
   * Track order
   */
  const trackOrder = async (req, res, next) => {
    console.log("OrderController => trackOrder");

    const { id } = req.params;
    const { userId } = req.body;

    const order = await OrderService().getOrderById(id);

    if (!order) {
      req.rCode = 5;
      req.msg = "order_not_found";
      return next();
    }

    if (order.userId._id.toString() !== userId.toString()) {
      req.rCode = 4;
      req.msg = "unauthorized";
      return next();
    }

    // Build tracking timeline
    const statusLabels = {
      1: "Order Received",
      2: "Ready to Ship",
      3: "On the Way",
      4: "Delivered",
      5: "Cancelled",
    };

    const timeline = [];

    // Add completed statuses
    for (let i = 1; i <= Math.min(order.status, 4); i++) {
      timeline.push({
        status: i,
        label: statusLabels[i],
        isComplete: order.status >= i,
        isCurrent: order.status === i,
      });
    }

    if (order.status === 5) {
      timeline.push({
        status: 5,
        label: "Cancelled",
        isComplete: true,
        isCurrent: true,
        reason: order.cancelReason,
      });
    }

    req.rData = {
      orderId: order.orderId,
      status: order.status,
      statusLabel: statusLabels[order.status],
      timeline,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt,
    };
    req.msg = "success";
    next();
  };

  /**
   * Reorder (add all items from previous order to cart)
   */
  const reorder = async (req, res, next) => {
    console.log("OrderController => reorder");

    const { userId } = req.body;
    const { id } = req.params;

    const order = await OrderService().getOrderById(id);

    if (!order) {
      req.rCode = 5;
      req.msg = "order_not_found";
      return next();
    }

    if (order.userId._id.toString() !== userId.toString()) {
      req.rCode = 4;
      req.msg = "unauthorized";
      return next();
    }

    // Add each product to cart
    for (const item of order.products) {
      try {
        await CartService().addToCart(userId, {
          productId: item.productId.toString(),
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        });
      } catch (error) {
        console.log(
          `Could not add product ${item.productId} to cart:`,
          error.message,
        );
      }
    }

    const cart = await CartService().getCart(userId);

    req.rData = cart;
    req.msg = "items_added_to_cart";
    next();
  };

  return {
    placeOrder,
    verifyPayment,
    getOrders,
    getOrderDetails,
    cancelOrder,
    trackOrder,
    reorder,
  };
};
