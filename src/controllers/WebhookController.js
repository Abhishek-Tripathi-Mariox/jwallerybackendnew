const RazorpayService = require("../services/RazorpayService");
const OrderService = require("../services/OrderService");
const { awardLoyaltyPoints, safeNotify } = require("../util/orderNotifications");

module.exports = () => {
  /**
   * Razorpay webhook — the source of truth for payment status, independent of
   * whether the client's own /payment/verify call ever lands (app crash, user
   * force-closes before the callback, network drop after a successful charge).
   * Configure this URL in the Razorpay Dashboard → Settings → Webhooks, with
   * events "payment.captured" and "payment.failed", and paste the same secret
   * into the admin panel's Payment Gateway config.
   */
  const razorpay = async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody;

    if (!rawBody) {
      console.error("Razorpay webhook: missing raw body — check express.json verify hook");
      return res.status(400).json({ status: "missing_body" });
    }

    const { valid, reason } = await RazorpayService().verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!valid) {
      console.error("Razorpay webhook: signature check failed:", reason);
      return res.status(400).json({ status: "invalid_signature" });
    }

    const event = req.body?.event;
    console.log("Razorpay webhook event:", event);

    try {
      if (event === "payment.captured" || event === "order.paid") {
        const paymentEntity = req.body?.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;

        if (razorpayOrderId) {
          const order = await OrderService().markOrderPaid(
            { razorpayOrderId },
            {
              razorpayOrderId,
              razorpayPaymentId: paymentEntity.id,
              razorpaySignature: "",
            },
          );

          // Non-null only on the transition that actually flipped the order —
          // keeps loyalty points/notifications from firing twice if both the
          // client's verify call and this webhook process the same payment.
          if (order) {
            await awardLoyaltyPoints(order.userId, order.grandTotal);
            await safeNotify({
              userId: order.userId,
              type: "order",
              title: "Payment received",
              message: `We've received your payment for order #${order.orderId}.`,
              link: "/orders",
              orderId: order._id,
            });
          }
        }
      } else if (event === "payment.failed") {
        const razorpayOrderId = req.body?.payload?.payment?.entity?.order_id;
        if (razorpayOrderId) {
          await OrderService().markOrderPaymentFailed(razorpayOrderId);
        }
      }
    } catch (err) {
      // Ack 200 regardless so Razorpay doesn't retry-storm us over a bug on
      // our side; the error is logged for manual follow-up.
      console.error("Razorpay webhook processing error:", err.message);
    }

    res.status(200).json({ status: "ok" });
  };

  return { razorpay };
};
