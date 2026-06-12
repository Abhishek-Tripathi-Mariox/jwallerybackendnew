const Coupon = require("../models/CouponCode");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Validate and get coupon
   */
  const validateCoupon = async (code, userId, cartTotal) => {
    const now = new Date();

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      isDeleted: { $ne: true },
    });

    if (!coupon) {
      return { valid: false, message: "Invalid coupon code" };
    }

    // Check validity dates
    if (coupon.startDate && coupon.startDate > now) {
      return { valid: false, message: "Coupon is not yet active" };
    }

    if (coupon.endDate && coupon.endDate < now) {
      return { valid: false, message: "Coupon has expired" };
    }

    // Check minimum order value
    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
      return {
        valid: false,
        message: `Minimum order value is ₹${coupon.minOrderValue}`,
      };
    }

    // Check user eligibility
    if (coupon.applicableFor === "newUser") {
      // Check if user has any previous orders
      const UserOrders = require("../models/UserOrders");
      const orderCount = await UserOrders.countDocuments({
        userId: new ObjectId(userId),
        status: { $ne: 5 }, // Not cancelled
      });

      if (orderCount > 0) {
        return { valid: false, message: "Coupon is only for new users" };
      }
    }

    if (coupon.applicableFor === "specificUser") {
      const User = require("../models/User");
      const user = await User.findById(userId);

      if (user.mobileNumber !== coupon.specificUserMobile) {
        return { valid: false, message: "Coupon is not applicable for you" };
      }
    }

    // Check usage limit per user
    if (coupon.maxUsagePerUser) {
      const UserOrders = require("../models/UserOrders");
      const usageCount = await UserOrders.countDocuments({
        userId: new ObjectId(userId),
        couponCodeId: coupon._id,
        status: { $ne: 5 },
      });

      if (usageCount >= coupon.maxUsagePerUser) {
        return { valid: false, message: "Coupon usage limit exceeded" };
      }
    }

    // Check total usage limit
    if (coupon.maxTotalUsage) {
      const UserOrders = require("../models/UserOrders");
      const totalUsage = await UserOrders.countDocuments({
        couponCodeId: coupon._id,
        status: { $ne: 5 },
      });

      if (totalUsage >= coupon.maxTotalUsage) {
        return { valid: false, message: "Coupon is fully redeemed" };
      }
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;

      // Apply max discount cap
      if (
        coupon.maxDiscountAmount &&
        discountAmount > coupon.maxDiscountAmount
      ) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount
      discountAmount = coupon.discountValue;
    }

    // Discount cannot exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return {
      valid: true,
      coupon: coupon,
      discountAmount: Math.round(discountAmount),
      message: "Coupon applied successfully",
    };
  };

  /**
   * Get available coupons for user
   */
  const getAvailableCoupons = async (userId, cartTotal = 0) => {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      isDeleted: { $ne: true },
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null },
      ],
    }).sort({ discountValue: -1 });

    // Filter coupons based on eligibility
    const availableCoupons = [];

    for (const coupon of coupons) {
      // Skip specific user coupons
      if (coupon.applicableFor === "specificUser") {
        const User = require("../models/User");
        const user = await User.findById(userId);
        if (user.mobileNumber !== coupon.specificUserMobile) {
          continue;
        }
      }

      // Check new user only
      if (coupon.applicableFor === "newUser") {
        const UserOrders = require("../models/UserOrders");
        const orderCount = await UserOrders.countDocuments({
          userId: new ObjectId(userId),
          status: { $ne: 5 },
        });

        if (orderCount > 0) {
          continue;
        }
      }

      availableCoupons.push({
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderValue: coupon.minOrderValue,
        isApplicable: cartTotal >= (coupon.minOrderValue || 0),
      });
    }

    return availableCoupons;
  };

  /**
   * Get coupon by ID
   */
  const getCouponById = (id) => {
    return new Promise((resolve, reject) => {
      Coupon.findById(id).then(resolve).catch(reject);
    });
  };

  /**
   * Create coupon (Admin)
   */
  const createCoupon = (data) => {
    data.code = data.code.toUpperCase();
    return new Promise((resolve, reject) => {
      Coupon.create(data).then(resolve).catch(reject);
    });
  };

  /**
   * Update coupon (Admin)
   */
  const updateCoupon = (id, data) => {
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    return new Promise((resolve, reject) => {
      Coupon.findByIdAndUpdate(id, data, { new: true })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Delete coupon (Admin)
   */
  const deleteCoupon = (id) => {
    return new Promise((resolve, reject) => {
      Coupon.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
        .then(resolve)
        .catch(reject);
    });
  };

  /**
   * Get all coupons (Admin)
   */
  const getAllCoupons = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      Coupon.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .then(resolve)
        .catch(reject);
    });
  };

  return {
    validateCoupon,
    getAvailableCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getAllCoupons,
  };
};
