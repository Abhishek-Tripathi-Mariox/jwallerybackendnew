const Cart = require("../models/Cart");
const Products = require("../models/Product");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Get or create cart for user
   */
  const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      cart = await Cart.create({
        userId: new ObjectId(userId),
        items: [],
        subtotal: 0,
        itemCount: 0,
        grandTotal: 0,
      });
    }

    return cart;
  };

  /**
   * Get cart with product details
   */
  const getCart = async (userId) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      return {
        items: [],
        subtotal: 0,
        itemCount: 0,
        couponCode: "",
        couponDiscount: 0,
        grandTotal: 0,
      };
    }

    return cart;
  };

  /**
   * Add item to cart
   */
  const addToCart = async (userId, productData) => {
    const { productId, quantity = 1, size = "", color = "" } = productData;

    // Normalize size and color for comparison
    const normalizedSize = (size || "").trim().toLowerCase();
    const normalizedColor = (color || "").trim().toLowerCase();

    // Fetch product details
    const product = await Products.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.isActive || product.isDeleted) {
      throw new Error("Product is not available");
    }

    if (product.stock < quantity) {
      throw new Error("Insufficient stock");
    }

    let cart = await getOrCreateCart(userId);

    // Check if product already exists in cart (with same size and color)
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        (item.size || "").trim().toLowerCase() === normalizedSize &&
        (item.color || "").trim().toLowerCase() === normalizedColor,
    );

    // Price snapshot — capture the customer-facing price at add-time. For
    // gold-priced items we use the live computed price so the cart total is
    // locked at the moment of click and doesn't fluctuate with gold rates.
    let unitPrice = product.price;
    let discountPrice = product.discountPrice || product.price;
    if (product.goldPricing && product.goldPricing.isEnabled) {
      try {
        const { computeGoldPrice } = require("../util/goldPricing");
        const GoldPriceService = require("./GoldPriceService");
        const prices = await GoldPriceService().getFormattedPrices();
        const rate24K =
          prices.find((p) => p.purity === "24K")?.rate || 0;
        const breakdown = computeGoldPrice({
          weightGrams: product.goldPricing.weightGrams,
          goldPurityPercent: product.goldPricing.goldPurityPercent,
          makingChargePercent: product.goldPricing.makingChargePercent,
          rate24K,
        });
        if (breakdown.price > 0) {
          unitPrice = breakdown.price;
          discountPrice = breakdown.price;
        }
      } catch (err) {
        console.error("Gold price snapshot failed:", err.message);
      }
    }

    const productImage =
      product.productImages && product.productImages.length > 0
        ? product.productImages[0].url
        : "";

    if (existingItemIndex > -1) {
      // Update quantity - product already exists in cart
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalPrice =
        cart.items[existingItemIndex].quantity * discountPrice;
    } else {
      // Add new item
      cart.items.push({
        productId: new ObjectId(productId),
        productName: product.productName,
        productImage: productImage,
        size: normalizedSize,
        color: normalizedColor,
        quantity,
        unitPrice,
        discountPrice,
        totalPrice: quantity * discountPrice,
        addedAt: new Date(),
      });
    }

    // Recalculate totals
    cart.calculateTotals();
    await cart.save();

    return cart;
  };

  /**
   * Update cart item quantity
   */
  const updateCartItem = async (userId, itemId, quantity) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      throw new Error("Cart not found");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in cart");
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      // Check stock
      const product = await Products.findById(cart.items[itemIndex].productId);
      if (product && product.stock < quantity) {
        throw new Error("Insufficient stock");
      }

      cart.items[itemIndex].quantity = quantity;
      const price =
        cart.items[itemIndex].discountPrice || cart.items[itemIndex].unitPrice;
      cart.items[itemIndex].totalPrice = quantity * price;
    }

    cart.calculateTotals();
    await cart.save();

    return cart;
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = async (userId, itemId) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    cart.calculateTotals();
    await cart.save();

    return cart;
  };

  /**
   * Clear entire cart
   */
  const clearCart = async (userId) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (cart) {
      cart.items = [];
      cart.subtotal = 0;
      cart.itemCount = 0;
      cart.couponId = null;
      cart.couponCode = "";
      cart.couponDiscount = 0;
      cart.grandTotal = 0;
      await cart.save();
    }

    return cart;
  };

  /**
   * Apply coupon to cart
   */
  const applyCoupon = async (userId, couponId, couponCode, discountAmount) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.couponId = couponId;
    cart.couponCode = couponCode;
    cart.couponDiscount = discountAmount;
    cart.grandTotal = cart.subtotal - discountAmount;

    await cart.save();

    return cart;
  };

  /**
   * Remove coupon from cart
   */
  const removeCoupon = async (userId) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.couponId = null;
    cart.couponCode = "";
    cart.couponDiscount = 0;
    cart.grandTotal = cart.subtotal;

    await cart.save();

    return cart;
  };

  /**
   * Get cart item count
   */
  const getCartCount = async (userId) => {
    const cart = await Cart.findOne({ userId: new ObjectId(userId) });
    return cart ? cart.itemCount : 0;
  };

  return {
    getOrCreateCart,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    getCartCount,
  };
};
