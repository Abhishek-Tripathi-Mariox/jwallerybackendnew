const Banners = require("../models/Banners");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Get active banners
   */
  const getActiveBanners = (limit = 10) => {
    const now = new Date();

    return new Promise((resolve, reject) => {
      // A banner shows whenever it's active. The expire date is optional and
      // no longer hides a banner once it passes (per product decision) — set a
      // banner Inactive to take it down. An optional start date still lets you
      // schedule a banner to appear later; an unset start means "show now".
      Banners.find({
        isActive: true,
        $or: [{ startDate: null }, { startDate: { $lte: now } }],
      })
        .sort({ rank: 1 })
        .limit(limit)
        .select("-__v")
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get banner by ID
   */
  const getBannerById = (id) => {
    return new Promise((resolve, reject) => {
      Banners.findById(id).then(resolve).catch(reject);
    });
  };

  /**
   * Create banner (Admin)
   */
  const createBanner = (data) => {
    return new Promise((resolve, reject) => {
      Banners.create(data).then(resolve).catch(reject);
    });
  };

  /**
   * Update banner (Admin)
   */
  const updateBanner = (id, data) => {
    return new Promise((resolve, reject) => {
      Banners.findByIdAndUpdate(id, data, { new: true })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Delete banner (Admin)
   */
  const deleteBanner = (id) => {
    return new Promise((resolve, reject) => {
      Banners.findByIdAndDelete(id).then(resolve).catch(reject);
    });
  };

  /**
   * Get all banners (Admin)
   */
  const getAllBanners = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      Banners.find()
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limit)
        .then(resolve)
        .catch(reject);
    });
  };

  return {
    getActiveBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    getAllBanners,
  };
};
