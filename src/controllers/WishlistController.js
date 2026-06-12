const WishlistService = require("../services/WishlistService");
const ProductService = require("../services/ProductService");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Add product to wishlist
   */
  const addToWishlist = async (req, res, next) => {
    console.log("WishlistController => addToWishlist");

    const { userId, productId } = req.body;

    // Check if product exists
    const product = await ProductService().fetch(productId);
    if (!product) {
      req.rCode = 5;
      req.msg = "product_not_found";
      return next();
    }

    // Check if already in wishlist
    const existing = await WishlistService().checkExists(userId, productId);
    if (existing) {
      req.rCode = 0;
      req.msg = "already_in_wishlist";
      return next();
    }

    // Add to wishlist
    const wishlistItem = await WishlistService().addToWishlist({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
      productName: product.productName,
      productImage:
        product.productImages && product.productImages.length > 0
          ? product.productImages[0].url
          : "",
      price: product.price,
      discountPrice: product.discountPrice,
    });

    req.rData = wishlistItem;
    req.msg = "added_to_wishlist";
    next();
  };

  /**
   * Remove product from wishlist
   */
  const removeFromWishlist = async (req, res, next) => {
    console.log("WishlistController => removeFromWishlist");

    const { userId } = req.body;
    const { productId } = req.params;

    await WishlistService().removeFromWishlist(userId, productId);

    req.rData = {};
    req.msg = "removed_from_wishlist";
    next();
  };

  /**
   * Get user's wishlist
   */
  const getWishlist = async (req, res, next) => {
    console.log("WishlistController => getWishlist");

    const { userId } = req.body;
    let { page, limit } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 20;

    const wishlist = await WishlistService().getUserWishlist(
      userId,
      page,
      limit,
    );
    const total = await WishlistService().countWishlist(userId);

    req.rData = {
      page,
      limit,
      total,
      wishlist,
    };
    req.msg = "success";
    next();
  };

  /**
   * Toggle wishlist (add if not exists, remove if exists)
   */
  const toggleWishlist = async (req, res, next) => {
    console.log("WishlistController => toggleWishlist");

    const { userId, productId } = req.body;

    // Check if product exists
    const product = await ProductService().fetch(productId);
    if (!product) {
      req.rCode = 5;
      req.msg = "product_not_found";
      return next();
    }

    // Check if already in wishlist
    const existing = await WishlistService().checkExists(userId, productId);

    if (existing) {
      // Remove from wishlist
      await WishlistService().removeFromWishlist(userId, productId);
      req.rData = { isWishlisted: false };
      req.msg = "removed_from_wishlist";
    } else {
      // Add to wishlist
      await WishlistService().addToWishlist({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        productName: product.productName,
        productImage:
          product.productImages && product.productImages.length > 0
            ? product.productImages[0].url
            : "",
        price: product.price,
        discountPrice: product.discountPrice,
      });
      req.rData = { isWishlisted: true };
      req.msg = "added_to_wishlist";
    }

    next();
  };

  /**
   * Clear entire wishlist
   */
  const clearWishlist = async (req, res, next) => {
    console.log("WishlistController => clearWishlist");

    const { userId } = req.body;

    await WishlistService().clearWishlist(userId);

    req.rData = {};
    req.msg = "wishlist_cleared";
    next();
  };

  /**
   * Get wishlist count
   */
  const getWishlistCount = async (req, res, next) => {
    console.log("WishlistController => getWishlistCount");

    const { userId } = req.body;

    const count = await WishlistService().countWishlist(userId);

    req.rData = { count };
    req.msg = "success";
    next();
  };

  return {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    toggleWishlist,
    clearWishlist,
    getWishlistCount,
  };
};
