const Razorpay = require("razorpay");
const crypto = require("crypto");
const SystemConfig = require("../models/SystemConfig");
const { decryptObject } = require("../util/encryption");
const { logRazorpay } = require("../util/razorpayLogger");

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
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
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

      logRazorpay("order_created", {
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      console.error("Razorpay create order error:", error);
      logRazorpay("order_create_failed", { error: error.message });
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

      logRazorpay(isValid ? "payment_verified" : "payment_verify_failed", {
        razorpayOrderId,
        razorpayPaymentId,
      });

      return {
        success: isValid,
        message: isValid
          ? "Payment verified successfully"
          : "Invalid signature",
      };
    } catch (error) {
      console.error("Razorpay verify payment error:", error);
      logRazorpay("payment_verify_error", {
        razorpayOrderId,
        razorpayPaymentId,
        error: error.message,
      });
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

      logRazorpay("refund_created", {
        paymentId,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      });

      return {
        success: true,
        refund,
      };
    } catch (error) {
      console.error("Razorpay refund error:", error);
      logRazorpay("refund_failed", { paymentId, error: error.message });
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

  /**
   * Verify a Razorpay webhook request's `x-razorpay-signature` header.
   * This is a *different* HMAC than verifyPayment's checkout signature — it's
   * computed over the raw webhook request body using the separate webhook
   * secret configured in the Razorpay dashboard (Settings → Webhooks).
   */
  const verifyWebhookSignature = async (rawBody, signature) => {
    const creds = await getRazorpayCredentials();

    if (!creds.webhookSecret) {
      return { valid: false, reason: "webhook_secret_not_configured" };
    }
    if (!signature) {
      return { valid: false, reason: "missing_signature" };
    }

    const expected = crypto
      .createHmac("sha256", creds.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);

    if (expectedBuf.length !== actualBuf.length) {
      return { valid: false, reason: "invalid_signature" };
    }

    return { valid: crypto.timingSafeEqual(expectedBuf, actualBuf) };
  };

  return {
    createOrder,
    verifyPayment,
    getPaymentDetails,
    refundPayment,
    getOrderDetails,
    getKeyId,
    verifyWebhookSignature,
  };
};
