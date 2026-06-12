const Rating = require("../models/Rating");
const Products = require("../models/Product");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Add a new review/rating
   */
  const addRating = async (ratingData) => {
    const rating = await Rating.create(ratingData);

    // Update product's average rating
    await updateProductRating(ratingData.productId);

    return rating;
  };

  /**
   * Check if user already reviewed this product for this order
   */
  const checkExistingReview = (userId, productId, orderId) => {
    return new Promise((resolve, reject) => {
      Rating.findOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        orderId: new ObjectId(orderId),
      })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Update product's average rating
   */
  const updateProductRating = async (productId) => {
    const result = await Rating.aggregate([
      {
        $match: {
          productId: new ObjectId(productId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await Products.findByIdAndUpdate(productId, {
        rating: Math.round(result[0].avgRating * 10) / 10,
        totalRatings: result[0].totalRatings,
      });
    }
  };

  /**
   * Get reviews for a product
   */
  const getProductReviews = (productId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      Rating.aggregate([
        {
          $match: {
            productId: new ObjectId(productId),
            isActive: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            rating: 1,
            reviewText: 1,
            reviewImages: 1,
            createdAt: 1,
            userName: "$user.fullName",
            userImage: "$user.profileImages",
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
   * Count reviews for a product
   */
  const countProductReviews = (productId) => {
    return new Promise((resolve, reject) => {
      Rating.countDocuments({
        productId: new ObjectId(productId),
        isActive: true,
      })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get user's reviews
   */
  const getUserReviews = (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      Rating.aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            isActive: true,
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
          $project: {
            _id: 1,
            rating: 1,
            reviewText: 1,
            reviewImages: 1,
            createdAt: 1,
            productId: 1,
            productName: "$product.productName",
            productImage: { $arrayElemAt: ["$product.productImages.url", 0] },
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
   * Get rating breakdown for a product (5 star, 4 star, etc.)
   */
  const getRatingBreakdown = (productId) => {
    return new Promise((resolve, reject) => {
      Rating.aggregate([
        {
          $match: {
            productId: new ObjectId(productId),
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ])
        .then((result) => {
          const breakdown = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          };
          result.forEach((item) => {
            breakdown[item._id] = item.count;
          });
          resolve(breakdown);
        })
        .catch(reject);
    });
  };

  /**
   * Update a review
   */
  const updateRating = (ratingId, userId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const rating = await Rating.findOneAndUpdate(
          {
            _id: new ObjectId(ratingId),
            userId: new ObjectId(userId),
          },
          data,
          { new: true },
        );

        if (rating) {
          await updateProductRating(rating.productId);
        }

        resolve(rating);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Delete a review (soft delete)
   */
  const deleteRating = async (ratingId, userId) => {
    const rating = await Rating.findOneAndUpdate(
      {
        _id: new ObjectId(ratingId),
        userId: new ObjectId(userId),
      },
      { isActive: false },
      { new: true },
    );

    if (rating) {
      await updateProductRating(rating.productId);
    }

    return rating;
  };

  return {
    addRating,
    checkExistingReview,
    updateProductRating,
    getProductReviews,
    countProductReviews,
    getUserReviews,
    getRatingBreakdown,
    updateRating,
    deleteRating,
  };
};
