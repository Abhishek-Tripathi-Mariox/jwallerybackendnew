const CustomerReviews = require("../models/CustomerReviews");

module.exports = () => {
  /** Active reviews for the website, ordered by rank. */
  const getActiveReviews = (limit = 50) =>
    CustomerReviews.find({ isActive: true })
      .sort({ rank: 1 })
      .limit(limit)
      .select("-__v");

  const getReviewById = (id) => CustomerReviews.findById(id);

  const createReview = (data) => CustomerReviews.create(data);

  const updateReview = (id, data) =>
    CustomerReviews.findByIdAndUpdate(id, data, { new: true });

  const deleteReview = (id) => CustomerReviews.findByIdAndDelete(id);

  /** Paginated list for the admin table. */
  const getAllReviews = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return Promise.all([
      CustomerReviews.find().sort({ rank: 1 }).skip(skip).limit(Number(limit)).lean(),
      CustomerReviews.countDocuments(),
    ]);
  };

  return {
    getActiveReviews,
    getReviewById,
    createReview,
    updateReview,
    deleteReview,
    getAllReviews,
  };
};
