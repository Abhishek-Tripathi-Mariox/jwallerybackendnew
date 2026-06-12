const Wishlist = require("../models/Wishlist");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Add item to wishlist
   */
  const addToWishlist = (data) => {
    return new Promise((resolve, reject) => {
      Wishlist.create(data).then(resolve).catch(reject);
    });
  };

  /**
   * Check if product exists in user's wishlist
   */
  const checkExists = (userId, productId) => {
    return new Promise((resolve, reject) => {
      Wishlist.findOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
      })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Remove item from wishlist
   */
  const removeFromWishlist = (userId, productId) => {
    return new Promise((resolve, reject) => {
      Wishlist.deleteOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
      })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Remove by wishlist ID
   */
  const removeById = (id) => {
    return new Promise((resolve, reject) => {
      Wishlist.deleteOne({ _id: new ObjectId(id) })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get user's wishlist with product details
   */
  const getUserWishlist = (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      Wishlist.aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            "product.isDeleted": { $ne: true },
            "product.isActive": true,
          },
        },
        {
          $project: {
            _id: 1,
            productId: 1,
            createdAt: 1,
            productName: "$product.productName",
            productImage: { $arrayElemAt: ["$product.productImages.url", 0] },
            price: "$product.price",
            discountPrice: "$product.discountPrice",
            discountPercent: "$product.discountPercent",
            rating: "$product.rating",
            stock: "$product.stock",
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Count user's wishlist items
   */
  const countWishlist = (userId) => {
    return new Promise((resolve, reject) => {
      Wishlist.countDocuments({ userId: new ObjectId(userId) })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Clear entire wishlist
   */
  const clearWishlist = (userId) => {
    return new Promise((resolve, reject) => {
      Wishlist.deleteMany({ userId: new ObjectId(userId) })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get wishlist product IDs for a user (for checking in product lists)
   */
  const getWishlistProductIds = (userId) => {
    return new Promise((resolve, reject) => {
      Wishlist.find({ userId: new ObjectId(userId) })
        .select("productId")
        .then((items) =>
          resolve(items.map((item) => item.productId.toString())),
        )
        .catch(reject);
    });
  };

  return {
    addToWishlist,
    checkExists,
    removeFromWishlist,
    removeById,
    getUserWishlist,
    countWishlist,
    clearWishlist,
    getWishlistProductIds,
  };
};
