const { Validator } = require("node-input-validator");
const ResponseMiddleware = require("../middlewares/ResponseMiddleware");
const helpers = require("../util/helpers");

module.exports = () => {
  /**
   * Validate add to cart request
   */
  const validateAddToCart = async (req, res, next) => {
    console.log("CartValidator => validateAddToCart");

    const v = new Validator(req.body, {
      productId: "required|string",
      quantity: "integer|min:1",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  /**
   * Validate update cart item
   */
  const validateUpdateCart = async (req, res, next) => {
    console.log("CartValidator => validateUpdateCart");

    const v = new Validator(req.body, {
      quantity: "required|integer|min:0",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  /**
   * Validate apply coupon
   */
  const validateApplyCoupon = async (req, res, next) => {
    console.log("CartValidator => validateApplyCoupon");

    const v = new Validator(req.body, {
      couponCode: "required|string|minLength:3",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  /**
   * Validate place order
   */
  const validatePlaceOrder = async (req, res, next) => {
    console.log("OrderValidator => validatePlaceOrder");

    const v = new Validator(req.body, {
      addressId: "required|string",
      paymentMode: "required|in:cod,online",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  /**
   * Validate verify payment
   */
  const validateVerifyPayment = async (req, res, next) => {
    console.log("OrderValidator => validateVerifyPayment");

    const v = new Validator(req.body, {
      orderId: "required|string",
      razorpayOrderId: "required|string",
      razorpayPaymentId: "required|string",
      razorpaySignature: "required|string",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  /**
   * Validate submit review
   */
  const validateSubmitReview = async (req, res, next) => {
    console.log("ReviewValidator => validateSubmitReview");

    const v = new Validator(req.body, {
      productId: "required|string",
      rating: "required|integer|min:1|max:5",
    });

    const matched = await v.check();

    if (!matched) {
      req.rCode = 0;
      req.msg = helpers().getErrorMessage(v.errors);
      ResponseMiddleware(req, res, next);
    } else {
      next();
    }
  };

  return {
    validateAddToCart,
    validateUpdateCart,
    validateApplyCoupon,
    validatePlaceOrder,
    validateVerifyPayment,
    validateSubmitReview,
  };
};
