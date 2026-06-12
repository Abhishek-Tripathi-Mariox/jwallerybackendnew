const Razorpay = require("razorpay");
const crypto = require("crypto");
const SystemConfig = require("../models/SystemConfig");
const { decryptObject } = require("../util/encryption");

const getRazorpayCredentials = async () => {
  const config = await SystemConfig.findOne({
    configType: "payment",
    isActive: true,
  });

  if (config) {
    const credentialsObj = Object.fromEntries(config.credentials);
    return decryptObject(credentialsObj);
  }

  // Fallback to env vars
  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  };
};

const getRazorpayInstance = async () => {
  const creds = await getRazorpayCredentials();
  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
};

module.exports = () => {
  /**
   * Create Razorpay Order
   */
  const createOrder = async (amount, currency = "INR", receipt = null) => {
    try {
      const razorpay = await getRazorpayInstance();
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1,
      };

      const order = await razorpay.orders.create(options);

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      console.error("Razorpay create order error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Verify Razorpay Payment Signature
   */
  const verifyPayment = async (
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  ) => {
    try {
      const creds = await getRazorpayCredentials();
      const body = razorpayOrderId + "|" + razorpayPaymentId;

      const expectedSignature = crypto
        .createHmac("sha256", creds.keySecret)
        .update(body.toString())
        .digest("hex");

      const isValid = expectedSignature === razorpaySignature;

      return {
        success: isValid,
        message: isValid
          ? "Payment verified successfully"
          : "Invalid signature",
      };
    } catch (error) {
      console.error("Razorpay verify payment error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Get Payment Details
   */
  const getPaymentDetails = async (paymentId) => {
    try {
      const razorpay = await getRazorpayInstance();
      const payment = await razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment,
      };
    } catch (error) {
      console.error("Razorpay get payment error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Refund Payment
   */
  const refundPayment = async (paymentId, amount = null) => {
    try {
      const razorpay = await getRazorpayInstance();
      const refundOptions = {};

      if (amount) {
        refundOptions.amount = Math.round(amount * 100);
      }

      const refund = await razorpay.payments.refund(paymentId, refundOptions);

      return {
        success: true,
        refund,
      };
    } catch (error) {
      console.error("Razorpay refund error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Get Order Details from Razorpay
   */
  const getOrderDetails = async (orderId) => {
    try {
      const razorpay = await getRazorpayInstance();
      const order = await razorpay.orders.fetch(orderId);
      return {
        success: true,
        order,
      };
    } catch (error) {
      console.error("Razorpay get order error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Get Razorpay Key ID (for frontend)
   */
  const getKeyId = async () => {
    const creds = await getRazorpayCredentials();
    return creds.keyId;
  };

  return {
    createOrder,
    verifyPayment,
    getPaymentDetails,
    refundPayment,
    getOrderDetails,
    getKeyId,
  };
};
