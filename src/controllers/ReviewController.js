const RatingService = require("../services/RatingService");
const OrderService = require("../services/OrderService");
const fileUploadService = require("../util/s3");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Submit a product review
   */
  const submitReview = async (req, res, next) => {
    console.log("ReviewController => submitReview");

    const { userId, productId, orderId, rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      req.rCode = 0;
      req.msg = "invalid_rating";
      return next();
    }

    // Check if order is delivered
    const order = await OrderService().getDeliveredOrderWithProduct(
      userId,
      productId,
    );

    if (!order) {
      req.rCode = 0;
      req.msg = "cannot_review_undelivered";
      return next();
    }

    // Check if already reviewed
    const existingReview = await RatingService().checkExistingReview(
      userId,
      productId,
      order._id,
    );

    if (existingReview) {
      req.rCode = 0;
      req.msg = "already_reviewed";
      return next();
    }

    // Handle review images
    let reviewImages = [];
    if (req.files && req.files.reviewImages) {
      const files = Array.isArray(req.files.reviewImages)
        ? req.files.reviewImages
        : [req.files.reviewImages];

      for (const file of files) {
        const uploadRes = await fileUploadService.uploadFileToAws(file);
        reviewImages.push({ url: uploadRes.images });
      }
    }

    // Find sellerId from order product
    const orderProduct = order.products.find(
      (p) => p.productId.toString() === productId,
    );

    const reviewData = {
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
      orderId: order._id,
      sellerId: orderProduct?.sellerId || null,
      rating,
      reviewText: reviewText || "",
      reviewImages,
    };

    const review = await RatingService().addRating(reviewData);

    req.rData = review;
    req.msg = "review_submitted";
    next();
  };

  /**
   * Get reviews for a product
   */
  const getProductReviews = async (req, res, next) => {
    console.log("ReviewController => getProductReviews");

    const { id } = req.params;
    let { page, limit } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    const reviews = await RatingService().getProductReviews(id, page, limit);
    const total = await RatingService().countProductReviews(id);
    const breakdown = await RatingService().getRatingBreakdown(id);

    req.rData = {
      page,
      limit,
      total,
      breakdown,
      reviews,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get user's reviews
   */
  const getUserReviews = async (req, res, next) => {
    console.log("ReviewController => getUserReviews");

    const { userId } = req.body;
    let { page, limit } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    const reviews = await RatingService().getUserReviews(userId, page, limit);

    req.rData = {
      page,
      limit,
      reviews,
    };
    req.msg = "success";
    next();
  };

  /**
   * Update a review
   */
  const updateReview = async (req, res, next) => {
    console.log("ReviewController => updateReview");

    const { userId, rating, reviewText } = req.body;
    const { id } = req.params;

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      req.rCode = 0;
      req.msg = "invalid_rating";
      return next();
    }

    const updateData = {};
    if (rating) updateData.rating = rating;
    if (reviewText !== undefined) updateData.reviewText = reviewText;

    // Handle new review images
    if (req.files && req.files.reviewImages) {
      const files = Array.isArray(req.files.reviewImages)
        ? req.files.reviewImages
        : [req.files.reviewImages];

      updateData.reviewImages = [];
      for (const file of files) {
        const uploadRes = await fileUploadService.uploadFileToAws(file);
        updateData.reviewImages.push({ url: uploadRes.images });
      }
    }

    const review = await RatingService().updateRating(id, userId, updateData);

    if (!review) {
      req.rCode = 5;
      req.msg = "review_not_found";
      return next();
    }

    req.rData = review;
    req.msg = "review_updated";
    next();
  };

  /**
   * Delete a review
   */
  const deleteReview = async (req, res, next) => {
    console.log("ReviewController => deleteReview");

    const { userId } = req.body;
    const { id } = req.params;

    const review = await RatingService().deleteRating(id, userId);

    if (!review) {
      req.rCode = 5;
      req.msg = "review_not_found";
      return next();
    }

    req.rData = {};
    req.msg = "review_deleted";
    next();
  };

  /**
   * Check if user can review a product
   */
  const canReview = async (req, res, next) => {
    console.log("ReviewController => canReview");

    const { userId } = req.body;
    const { productId } = req.params;

    const canReview = await OrderService().canReviewProduct(userId, productId);

    if (!canReview) {
      req.rData = { canReview: false, reason: "Product not delivered yet" };
    } else {
      // Check if already reviewed
      const order = await OrderService().getDeliveredOrderWithProduct(
        userId,
        productId,
      );
      const existingReview = await RatingService().checkExistingReview(
        userId,
        productId,
        order._id,
      );

      if (existingReview) {
        req.rData = {
          canReview: false,
          reason: "Already reviewed",
          review: existingReview,
        };
      } else {
        req.rData = { canReview: true, orderId: order._id };
      }
    }

    req.msg = "success";
    next();
  };

  return {
    submitReview,
    getProductReviews,
    getUserReviews,
    updateReview,
    deleteReview,
    canReview,
  };
};
