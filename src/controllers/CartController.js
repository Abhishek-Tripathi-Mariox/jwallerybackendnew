const CartService = require("../services/CartService");
const CouponService = require("../services/CouponService");
const ChargeConfigService = require("../services/ChargeConfigService");
var ObjectId = require("mongoose").Types.ObjectId;

// Decorate a cart document with the current charge breakdown so the website
// can render a consistent summary. Pure read-only: doesn't persist anything.
const withCharges = async (cart) => {
  if (!cart) return cart;
  const subtotal = cart.subtotal || 0;
  const couponDiscount = cart.couponDiscount || 0;
  const { shippingCost, platformFee } = await ChargeConfigService().computeCharges({
    subtotal,
    couponDiscount,
  });
  const base = cart.toObject ? cart.toObject() : cart;
  const computedGrandTotal =
    Math.max(0, subtotal - couponDiscount) + shippingCost + platformFee;
  return {
    ...base,
    shippingCost,
    platformFee,
    grandTotal: computedGrandTotal,
  };
};

module.exports = () => {
  /**
   * Get user's cart
   */
  const getCart = async (req, res, next) => {
    console.log("CartController => getCart");

    const { userId } = req.body;

    const cart = await CartService().getCart(userId);

    req.rData = await withCharges(cart);
    req.msg = "success";
    next();
  };

  /**
   * Add item to cart
   */
  const addToCart = async (req, res, next) => {
    console.log("CartController => addToCart");

    const { userId, productId, quantity, size, color } = req.body;

    try {
      const cart = await CartService().addToCart(userId, {
        productId,
        quantity: quantity || 1,
        size: size || "",
        color: color || "",
      });

      req.rData = cart;
      req.msg = "added_to_cart";
    } catch (error) {
      req.rCode = 0;
      req.msg = error.message;
    }

    next();
  };

  /**
   * Update cart item quantity
   */
  const updateCartItem = async (req, res, next) => {
    console.log("CartController => updateCartItem");

    const { userId, quantity } = req.body;
    const { itemId } = req.params;

    try {
      const cart = await CartService().updateCartItem(userId, itemId, quantity);

      req.rData = cart;
      req.msg = "cart_updated";
    } catch (error) {
      req.rCode = 0;
      req.msg = error.message;
    }

    next();
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = async (req, res, next) => {
    console.log("CartController => removeFromCart");

    const { userId } = req.body;
    const { itemId } = req.params;

    try {
      const cart = await CartService().removeFromCart(userId, itemId);

      req.rData = cart;
      req.msg = "removed_from_cart";
    } catch (error) {
      req.rCode = 0;
      req.msg = error.message;
    }

    next();
  };

  /**
   * Clear entire cart
   */
  const clearCart = async (req, res, next) => {
    console.log("CartController => clearCart");

    const { userId } = req.body;

    await CartService().clearCart(userId);

    req.rData = {};
    req.msg = "cart_cleared";
    next();
  };

  /**
   * Apply coupon to cart
   */
  const applyCoupon = async (req, res, next) => {
    console.log("CartController => applyCoupon");

    const { userId, couponCode } = req.body;

    // Get cart to check total
    const cart = await CartService().getCart(userId);

    if (!cart || cart.items.length === 0) {
      req.rCode = 0;
      req.msg = "cart_empty";
      return next();
    }

    // Validate coupon
    const validation = await CouponService().validateCoupon(
      couponCode,
      userId,
      cart.subtotal,
    );

    if (!validation.valid) {
      req.rCode = 0;
      req.msg = validation.message;
      return next();
    }

    // Apply coupon to cart
    const updatedCart = await CartService().applyCoupon(
      userId,
      validation.coupon._id,
      validation.coupon.code,
      validation.discountAmount,
    );

    req.rData = {
      cart: updatedCart,
      coupon: {
        code: validation.coupon.code,
        discountAmount: validation.discountAmount,
      },
    };
    req.msg = "coupon_applied";
    next();
  };

  /**
   * Remove coupon from cart
   */
  const removeCoupon = async (req, res, next) => {
    console.log("CartController => removeCoupon");

    const { userId } = req.body;

    const cart = await CartService().removeCoupon(userId);

    req.rData = cart;
    req.msg = "coupon_removed";
    next();
  };

  /**
   * Get cart count
   */
  const getCartCount = async (req, res, next) => {
    console.log("CartController => getCartCount");

    const { userId } = req.body;

    const count = await CartService().getCartCount(userId);

    req.rData = { count };
    req.msg = "success";
    next();
  };

  /**
   * Get available coupons
   */
  const getAvailableCoupons = async (req, res, next) => {
    console.log("CartController => getAvailableCoupons");

    const { userId } = req.body;

    // Get cart total
    const cart = await CartService().getCart(userId);
    const cartTotal = cart ? cart.subtotal : 0;

    const coupons = await CouponService().getAvailableCoupons(
      userId,
      cartTotal,
    );

    req.rData = coupons;
    req.msg = "success";
    next();
  };

  return {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    getCartCount,
    getAvailableCoupons,
  };
};
