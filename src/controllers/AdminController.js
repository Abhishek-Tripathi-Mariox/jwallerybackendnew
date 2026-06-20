const Category = require("../models/Catagory");
const Product = require("../models/Product");
const User = require("../models/User");
const UserOrders = require("../models/UserOrders");
const Cart = require("../models/Cart");
const Banners = require("../models/Banners");
const CustomerReviewService = require("../services/CustomerReviewService");
const SubCategoryService = require("../services/SubCategoryService");
const ReelService = require("../services/ReelService");
const RegexEscape = require("regex-escape");
const { uploadFileToAws } = require("../util/s3");
const RazorpayService = require("../services/RazorpayService");
const NotificationService = require("../services/NotificationService");

const ORDER_STATUS_NOTIFY = {
  2: { title: "Order ready to ship", msg: "Your order is packed and ready to ship." },
  3: { title: "Order on the way", msg: "Your order has been shipped and is on its way." },
  4: { title: "Order delivered", msg: "Your order has been delivered. Enjoy!" },
  5: { title: "Order cancelled", msg: "Your order has been cancelled." },
};

module.exports = () => {
  // ==================== DASHBOARD ====================

  const getDashboardStats = async (req, res, next) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalOrders, totalUsers, totalProducts, totalCategories, pendingOrders] =
      await Promise.all([
        UserOrders.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false }),
        Product.countDocuments({ isDeleted: false }),
        Category.countDocuments({ isDeleted: false }),
        UserOrders.countDocuments({ isDeleted: false, status: { $in: [1, 2, 3] } }),
      ]);

    const [revenueAgg, monthlyRevenueAgg, lastMonthRevenueAgg, lastMonthOrders, lastMonthUsers, lastMonthProducts] =
      await Promise.all([
        UserOrders.aggregate([
          { $match: { paymentStatus: "paid", isDeleted: false } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]),
        UserOrders.aggregate([
          { $match: { paymentStatus: "paid", isDeleted: false, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]),
        UserOrders.aggregate([
          { $match: { paymentStatus: "paid", isDeleted: false, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]),
        UserOrders.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        User.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        Product.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;
    const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;

    // Calculate trends (percentage change from last month)
    const calcTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat(((current - previous) / previous * 100).toFixed(1));
    };

    const thisMonthOrders = await UserOrders.countDocuments({ isDeleted: false, createdAt: { $gte: startOfMonth } });
    const thisMonthUsers = await User.countDocuments({ isDeleted: false, createdAt: { $gte: startOfMonth } });
    const thisMonthProducts = await Product.countDocuments({ isDeleted: false, createdAt: { $gte: startOfMonth } });

    req.rData = {
      totalOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      totalCategories,
      pendingOrders,
      monthlyRevenue,
      trends: {
        revenue: calcTrend(monthlyRevenue, lastMonthRevenue),
        orders: calcTrend(thisMonthOrders, lastMonthOrders),
        users: calcTrend(thisMonthUsers, lastMonthUsers),
        products: calcTrend(thisMonthProducts, lastMonthProducts),
      },
    };
    next();
  };

  const getSalesChart = async (req, res, next) => {
    const { period = "month" } = req.query;
    const now = new Date();
    let startDate, groupFormat, labels = [];

    if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(d.toISOString().split("T")[0]);
      }
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      for (let i = 0; i < 12; i++) {
        const m = String(i + 1).padStart(2, "0");
        labels.push(`${now.getFullYear()}-${m}`);
      }
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(i).padStart(2, "0");
        labels.push(`${now.getFullYear()}-${m}-${d}`);
      }
    }

    const salesData = await UserOrders.aggregate([
      { $match: { paymentStatus: "paid", isDeleted: false, createdAt: { $gte: startDate } } },
      { $group: { _id: groupFormat, total: { $sum: "$grandTotal" } } },
      { $sort: { _id: 1 } },
    ]);

    const salesMap = {};
    salesData.forEach(s => { salesMap[s._id] = s.total; });
    const data = labels.map(l => salesMap[l] || 0);

    req.rData = { labels, data };
    next();
  };

  const updateAdminProfile = async (req, res, next) => {
    const { name, email } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;

    const Admin = require("../models/Admin");
    const admin = await Admin.findByIdAndUpdate(req.admin.id, update, { new: true }).select("-password");
    req.rData = admin;
    req.msg = "success";
    next();
  };

  const getRecentOrders = async (req, res, next) => {
    const orders = await UserOrders.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "fullName email mobileNumber profileImages")
      .lean();

    req.rData = { orders };
    next();
  };

  // ==================== CATEGORIES ====================

  const getCategories = async (req, res, next) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.categoryName = { $regex: RegexEscape(search), $options: "i" };
    }
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ rank: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Category.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, categories };
    next();
  };

  const getCategoryById = async (req, res, next) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.rCode = 5;
      req.msg = "category_not_found";
      return next();
    }
    req.rData = category;
    next();
  };

  const createCategory = async (req, res, next) => {
    const { categoryName, description, rank } = req.body;
    let image = "";
    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      image = result.images;
    }
    const { showOnHomeScreen } = req.body;
    const category = await Category.create({
      categoryName,
      description,
      rank: rank || 0,
      image,
      showOnHomeScreen: showOnHomeScreen !== undefined ? showOnHomeScreen : true,
    });
    req.rData = category;
    req.msg = "success";
    next();
  };

  const updateCategory = async (req, res, next) => {
    const { categoryName, description, rank, isActive } = req.body;
    const update = {};
    if (categoryName !== undefined) update.categoryName = categoryName;
    if (description !== undefined) update.description = description;
    if (rank !== undefined) update.rank = rank;
    if (isActive !== undefined) update.isActive = isActive;
    if (req.body.showOnHomeScreen !== undefined) update.showOnHomeScreen = req.body.showOnHomeScreen;

    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      update.image = result.images;
    }
    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    req.rData = category;
    req.msg = "success";
    next();
  };

  const deleteCategory = async (req, res, next) => {
    await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
    req.msg = "success";
    next();
  };

  const toggleCategoryStatus = async (req, res, next) => {
    const { isActive } = req.body;
    const cat = await Category.findById(req.params.id);
    cat.isActive = isActive !== undefined ? isActive : !cat.isActive;
    await cat.save();
    req.rData = { isActive: cat.isActive };
    next();
  };

  // ==================== PRODUCTS ====================

  const getProducts = async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      categoryId,
      status,
    } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { productName: { $regex: RegexEscape(search), $options: "i" } },
        { brand: { $regex: RegexEscape(search), $options: "i" } },
      ];
    }
    if (categoryId) query.categoryId = categoryId;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("categoryId", "categoryName")
        .lean(),
      Product.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, products };
    next();
  };

  const getProductById = async (req, res, next) => {
    const product = await Product.findById(req.params.id)
      .populate("categoryId", "categoryName")
      .lean();
    if (!product) {
      req.rCode = 5;
      req.msg = "product_not_found";
      return next();
    }
    req.rData = product;
    next();
  };

  const createProduct = async (req, res, next) => {
    const body = req.body;
    const productData = {
      productName: body.productName,
      brand: body.brand,
      categoryId: body.categoryId,
      ...(body.subCategoryId ? { subCategoryId: body.subCategoryId } : {}),
      material: body.material || "",
      price: body.price,
      discountPrice: body.discountPrice,
      discountPercent: body.discountPercent,
      stock: body.stock,
      description: body.description,
      features: body.features,
      isFeatured: body.isFeatured === "true" || body.isFeatured === true,
      isActive: true,
      slug:
        body.productName?.toLowerCase().replace(/\s+/g, "-") +
        "-" +
        Date.now(),
    };

    // Parse goldPricing JSON blob if present.
    if (body.goldPricing) {
      try {
        const gp =
          typeof body.goldPricing === "string"
            ? JSON.parse(body.goldPricing)
            : body.goldPricing;
        productData.goldPricing = {
          isEnabled: !!gp.isEnabled,
          weightGrams: Number(gp.weightGrams) || 0,
          goldPurityPercent: Number(gp.goldPurityPercent) || 0,
          makingChargePercent: Number(gp.makingChargePercent) || 0,
        };
      } catch {
        // Ignore malformed payload — product just won't have gold pricing.
      }
    }

    // Handle product images
    if (req.files && req.files.productImages) {
      const files = Array.isArray(req.files.productImages)
        ? req.files.productImages
        : [req.files.productImages];
      productData.productImages = [];
      for (const file of files) {
        const result = await uploadFileToAws(file);
        productData.productImages.push({ url: result.images });
      }
    }

    const product = await Product.create(productData);
    req.rData = product;
    req.msg = "success";
    next();
  };

  const updateProduct = async (req, res, next) => {
    const body = req.body;
    const update = {};
    const fields = [
      "productName",
      "brand",
      "categoryId",
      "subCategoryId",
      "material",
      "price",
      "discountPrice",
      "discountPercent",
      "stock",
      "description",
      "features",
      "isFeatured",
      "isActive",
    ];
    fields.forEach((f) => {
      if (body[f] !== undefined) update[f] = body[f];
    });

    if (body.goldPricing !== undefined) {
      try {
        const gp =
          typeof body.goldPricing === "string"
            ? JSON.parse(body.goldPricing)
            : body.goldPricing;
        update.goldPricing = {
          isEnabled: !!gp.isEnabled,
          weightGrams: Number(gp.weightGrams) || 0,
          goldPurityPercent: Number(gp.goldPurityPercent) || 0,
          makingChargePercent: Number(gp.makingChargePercent) || 0,
        };
      } catch {
        // Ignore — don't touch the existing value.
      }
    }

    if (req.files && req.files.productImages) {
      const files = Array.isArray(req.files.productImages)
        ? req.files.productImages
        : [req.files.productImages];
      update.productImages = [];
      for (const file of files) {
        const result = await uploadFileToAws(file);
        update.productImages.push({ url: result.images });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    req.rData = product;
    req.msg = "success";
    next();
  };

  const deleteProduct = async (req, res, next) => {
    await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
    req.msg = "success";
    next();
  };

  const toggleProductStatus = async (req, res, next) => {
    const { isActive } = req.body;
    const product = await Product.findById(req.params.id);
    product.isActive = isActive !== undefined ? isActive : !product.isActive;
    await product.save();
    req.rData = { isActive: product.isActive };
    next();
  };

  const toggleProductFeatured = async (req, res, next) => {
    const { isFeatured } = req.body;
    const product = await Product.findById(req.params.id);
    product.isFeatured = isFeatured !== undefined ? isFeatured : !product.isFeatured;
    await product.save();
    req.rData = { isFeatured: product.isFeatured };
    next();
  };

  // ==================== USERS ====================

  const getUsers = async (req, res, next) => {
    const { page = 1, limit = 10, search = "", status, city = "" } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { fullName: { $regex: RegexEscape(search), $options: "i" } },
        { email: { $regex: RegexEscape(search), $options: "i" } },
        { mobileNumber: { $regex: RegexEscape(search), $options: "i" } },
      ];
    }
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    // Customer location filter (by city)
    if (city) query.city = { $regex: RegexEscape(city), $options: "i" };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -__v")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, users };
    next();
  };

  const getUserById = async (req, res, next) => {
    const user = await User.findById(req.params.id)
      .select("-password -__v")
      .lean();
    if (!user) {
      req.rCode = 5;
      req.msg = "user_not_found";
      return next();
    }
    req.rData = user;
    next();
  };

  const toggleUserStatus = async (req, res, next) => {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();
    req.rData = { isActive: user.isActive };
    next();
  };

  // "Added but Not Bought" — carts that still hold items (products a customer
  // added but hasn't purchased yet). Useful for follow-up / abandoned-cart nudges.
  const getAbandonedCarts = async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const query = { "items.0": { $exists: true } };
    const [carts, total] = await Promise.all([
      Cart.find(query)
        .populate("userId", "fullName email mobileNumber city")
        .populate("items.productId", "productName productImages discountPrice price")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Cart.countDocuments(query),
    ]);
    // Keep only carts whose user still exists; flag those with no orders placed.
    const result = [];
    for (const c of carts) {
      if (!c.userId) continue;
      const orderCount = await UserOrders.countDocuments({
        userId: c.userId._id,
        isDeleted: false,
      });
      result.push({
        cartId: c._id,
        user: c.userId,
        itemCount: c.items.length,
        items: c.items,
        updatedAt: c.updatedAt,
        hasNeverOrdered: orderCount === 0,
      });
    }
    req.rData = { page: Number(page), limit: Number(limit), total, carts: result };
    next();
  };

  // ==================== ORDERS ====================

  const getOrders = async (req, res, next) => {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;
    const query = { isDeleted: false };
    if (status) query.status = Number(status);
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const [orders, total] = await Promise.all([
      UserOrders.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("userId", "fullName email mobileNumber profileImages")
        .populate("addressId")
        .lean(),
      UserOrders.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, orders };
    next();
  };

  const getOrderById = async (req, res, next) => {
    const order = await UserOrders.findById(req.params.id)
      .populate("userId", "fullName email mobileNumber profileImages")
      .populate("addressId")
      .lean();
    if (!order) {
      req.rCode = 5;
      req.msg = "order_not_found";
      return next();
    }
    req.rData = order;
    next();
  };

  const updateOrderStatus = async (req, res, next) => {
    const { status } = req.body;
    const update = { status: Number(status) };
    if (Number(status) === 4) update.deliveredAt = new Date();
    if (Number(status) === 5) update.cancelledAt = new Date();

    const order = await UserOrders.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    const tmpl = ORDER_STATUS_NOTIFY[Number(status)];
    if (order && tmpl) {
      try {
        await NotificationService().createForUser({
          userId: order.userId,
          type: "order",
          title: tmpl.title,
          message: `${tmpl.msg} Order #${order.orderId || order._id}.`,
          link: `/orders`,
          orderId: order._id,
          createdBy: req.admin?.id,
        });
      } catch (err) {
        console.error("Order status notification failed:", err.message);
      }
    }

    req.rData = order;
    req.msg = "success";
    next();
  };

  // ==================== PAYMENTS ====================

  const getPayments = async (req, res, next) => {
    const { page = 1, limit = 10, status } = req.query;
    const query = { isDeleted: false, paymentMode: "online" };
    if (status) query.paymentStatus = status;

    const [payments, total] = await Promise.all([
      UserOrders.find(query)
        .select(
          "orderId userId grandTotal paymentStatus paymentMode razorpayPaymentId razorpayOrderId createdAt paidAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("userId", "fullName email mobileNumber")
        .lean(),
      UserOrders.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, payments };
    next();
  };

  const getPaymentStats = async (req, res, next) => {
    const [totalPaid, totalPending, totalRefunded] = await Promise.all([
      UserOrders.aggregate([
        { $match: { paymentStatus: "paid", isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
      UserOrders.aggregate([
        { $match: { paymentStatus: "pending", isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
      UserOrders.aggregate([
        { $match: { paymentStatus: "refunded", isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
    ]);
    req.rData = {
      paid: { amount: totalPaid[0]?.total || 0, count: totalPaid[0]?.count || 0 },
      pending: { amount: totalPending[0]?.total || 0, count: totalPending[0]?.count || 0 },
      refunded: { amount: totalRefunded[0]?.total || 0, count: totalRefunded[0]?.count || 0 },
    };
    next();
  };

  // ==================== BANNERS ====================

  const getBanners = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const [banners, total] = await Promise.all([
      Banners.find().sort({ rank: 1 }).skip(skip).limit(Number(limit)).lean(),
      Banners.countDocuments(),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, banners };
    next();
  };

  const getBannerById = async (req, res, next) => {
    const banner = await Banners.findById(req.params.id);
    if (!banner) { req.rCode = 5; req.msg = "not_found"; return next(); }
    req.rData = banner;
    next();
  };

  const createBanner = async (req, res, next) => {
    const { title, subtitle, section, link, rank, startDate, expireDate } =
      req.body;
    let mobileView = "", ipadView = "", desktopView = "";
    if (req.files) {
      if (req.files.mobileView) {
        const result = await uploadFileToAws(req.files.mobileView);
        mobileView = result.images;
      }
      if (req.files.ipadView) {
        const result = await uploadFileToAws(req.files.ipadView);
        ipadView = result.images;
      }
      if (req.files.desktopView) {
        const result = await uploadFileToAws(req.files.desktopView);
        desktopView = result.images;
      }
    }
    const banner = await Banners.create({
      title,
      subtitle: subtitle || "",
      section: section || "home_offers",
      link: link || "",
      rank: rank || 0,
      startDate,
      expireDate,
      mobileView,
      ipadView,
      desktopView,
      isActive: true,
    });
    req.rData = banner;
    req.msg = "success";
    next();
  };

  const updateBanner = async (req, res, next) => {
    const { title, subtitle, section, link, rank, startDate, expireDate, isActive } =
      req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (subtitle !== undefined) update.subtitle = subtitle;
    if (section !== undefined) update.section = section;
    if (link !== undefined) update.link = link;
    if (rank !== undefined) update.rank = rank;
    if (startDate !== undefined) update.startDate = startDate;
    if (expireDate !== undefined) update.expireDate = expireDate;
    if (isActive !== undefined) update.isActive = isActive;
    if (req.files) {
      if (req.files.mobileView) {
        const result = await uploadFileToAws(req.files.mobileView);
        update.mobileView = result.images;
      }
      if (req.files.ipadView) {
        const result = await uploadFileToAws(req.files.ipadView);
        update.ipadView = result.images;
      }
      if (req.files.desktopView) {
        const result = await uploadFileToAws(req.files.desktopView);
        update.desktopView = result.images;
      }
    }
    const banner = await Banners.findByIdAndUpdate(req.params.id, update, { new: true });
    req.rData = banner;
    req.msg = "success";
    next();
  };

  const deleteBanner = async (req, res, next) => {
    await Banners.findByIdAndDelete(req.params.id);
    req.msg = "success";
    next();
  };

  const toggleBannerStatus = async (req, res, next) => {
    const banner = await Banners.findById(req.params.id);
    banner.isActive = !banner.isActive;
    await banner.save();
    req.rData = { isActive: banner.isActive };
    next();
  };

  // ==================== SUBCATEGORIES ====================

  const getSubCategories = async (req, res, next) => {
    const { page = 1, limit = 50, categoryId } = req.query;
    const [subCategories, total] = await SubCategoryService().getAll(
      Number(page),
      Number(limit),
      categoryId || undefined
    );
    req.rData = { page: Number(page), limit: Number(limit), total, subCategories };
    next();
  };

  const createSubCategory = async (req, res, next) => {
    const { subCategoryName, categoryId, rank } = req.body;
    let image = "";
    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      image = result.images;
    }
    const sub = await SubCategoryService().create({
      subCategoryName,
      categoryId,
      image,
      rank: rank ? Number(rank) : 0,
      isActive: true,
    });
    req.rData = sub;
    req.msg = "success";
    next();
  };

  const updateSubCategory = async (req, res, next) => {
    const { subCategoryName, categoryId, rank, isActive } = req.body;
    const update = {};
    if (subCategoryName !== undefined) update.subCategoryName = subCategoryName;
    if (categoryId !== undefined) update.categoryId = categoryId;
    if (rank !== undefined) update.rank = Number(rank);
    if (isActive !== undefined) update.isActive = isActive;
    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      update.image = result.images;
    }
    const sub = await SubCategoryService().update(req.params.id, update);
    req.rData = sub;
    req.msg = "success";
    next();
  };

  const deleteSubCategory = async (req, res, next) => {
    await SubCategoryService().remove(req.params.id);
    req.msg = "success";
    next();
  };

  const toggleSubCategoryStatus = async (req, res, next) => {
    const sub = await SubCategoryService().getById(req.params.id);
    sub.isActive = !sub.isActive;
    await sub.save();
    req.rData = { isActive: sub.isActive };
    next();
  };

  // ==================== CUSTOMER REVIEWS ====================

  const getCustomerReviews = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const [reviews, total] = await CustomerReviewService().getAllReviews(
      Number(page),
      Number(limit)
    );
    req.rData = { page: Number(page), limit: Number(limit), total, reviews };
    next();
  };

  const getCustomerReviewById = async (req, res, next) => {
    const review = await CustomerReviewService().getReviewById(req.params.id);
    if (!review) { req.rCode = 5; req.msg = "not_found"; return next(); }
    req.rData = review;
    next();
  };

  const createCustomerReview = async (req, res, next) => {
    const { name, rating, reviewText, rank } = req.body;
    let avatar = "";
    if (req.files && req.files.avatar) {
      const result = await uploadFileToAws(req.files.avatar);
      avatar = result.images;
    }
    const review = await CustomerReviewService().createReview({
      name,
      rating: rating ? Number(rating) : 5,
      reviewText,
      avatar,
      rank: rank ? Number(rank) : 0,
      isActive: true,
    });
    req.rData = review;
    req.msg = "success";
    next();
  };

  const updateCustomerReview = async (req, res, next) => {
    const { name, rating, reviewText, rank, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (rating !== undefined) update.rating = Number(rating);
    if (reviewText !== undefined) update.reviewText = reviewText;
    if (rank !== undefined) update.rank = Number(rank);
    if (isActive !== undefined) update.isActive = isActive;
    if (req.files && req.files.avatar) {
      const result = await uploadFileToAws(req.files.avatar);
      update.avatar = result.images;
    }
    const review = await CustomerReviewService().updateReview(req.params.id, update);
    req.rData = review;
    req.msg = "success";
    next();
  };

  const deleteCustomerReview = async (req, res, next) => {
    await CustomerReviewService().deleteReview(req.params.id);
    req.msg = "success";
    next();
  };

  const toggleCustomerReviewStatus = async (req, res, next) => {
    const review = await CustomerReviewService().getReviewById(req.params.id);
    review.isActive = !review.isActive;
    await review.save();
    req.rData = { isActive: review.isActive };
    next();
  };

  // ==================== REELS ====================

  // Decide whether an uploaded file is a video from its mimetype (express-
  // fileupload sets this), falling back to the file extension.
  const mediaTypeOf = (file) => {
    const mime = String(file?.mimetype || "");
    if (mime.startsWith("video")) return "video";
    if (mime.startsWith("image")) return "image";
    return /\.(mp4|webm|ogg|mov)$/i.test(file?.name || "") ? "video" : "image";
  };

  const getReels = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const [reels, total] = await ReelService().getAllReels(
      Number(page),
      Number(limit)
    );
    req.rData = { page: Number(page), limit: Number(limit), total, reels };
    next();
  };

  const getReelById = async (req, res, next) => {
    const reel = await ReelService().getReelById(req.params.id);
    if (!reel) { req.rCode = 5; req.msg = "not_found"; return next(); }
    req.rData = reel;
    next();
  };

  const createReel = async (req, res, next) => {
    const { title, instagramUrl, rank } = req.body;
    let mediaUrl = "";
    let mediaType = "image";
    let thumbnailUrl = "";
    if (req.files && req.files.media) {
      const result = await uploadFileToAws(req.files.media);
      mediaUrl = result.images;
      mediaType = mediaTypeOf(req.files.media);
    }
    if (req.files && req.files.thumbnail) {
      const result = await uploadFileToAws(req.files.thumbnail);
      thumbnailUrl = result.images;
    }
    const reel = await ReelService().createReel({
      title: title || "",
      mediaUrl,
      mediaType,
      thumbnailUrl,
      instagramUrl,
      rank: rank ? Number(rank) : 0,
      isActive: true,
    });
    req.rData = reel;
    req.msg = "success";
    next();
  };

  const updateReel = async (req, res, next) => {
    const { title, instagramUrl, rank, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (instagramUrl !== undefined) update.instagramUrl = instagramUrl;
    if (rank !== undefined) update.rank = Number(rank);
    if (isActive !== undefined) update.isActive = isActive === true || isActive === "true";
    if (req.files && req.files.media) {
      const result = await uploadFileToAws(req.files.media);
      update.mediaUrl = result.images;
      update.mediaType = mediaTypeOf(req.files.media);
    }
    if (req.files && req.files.thumbnail) {
      const result = await uploadFileToAws(req.files.thumbnail);
      update.thumbnailUrl = result.images;
    }
    const reel = await ReelService().updateReel(req.params.id, update);
    req.rData = reel;
    req.msg = "success";
    next();
  };

  const deleteReel = async (req, res, next) => {
    await ReelService().deleteReel(req.params.id);
    req.msg = "success";
    next();
  };

  const toggleReelStatus = async (req, res, next) => {
    const reel = await ReelService().getReelById(req.params.id);
    reel.isActive = !reel.isActive;
    await reel.save();
    req.rData = { isActive: reel.isActive };
    next();
  };

  // ==================== COUPONS ====================

  const CouponModel = require("../models/CouponCode");

  const getCoupons = async (req, res, next) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (search) {
      query.$or = [
        { code: { $regex: RegexEscape(search), $options: "i" } },
        { title: { $regex: RegexEscape(search), $options: "i" } },
      ];
    }
    const [coupons, total] = await Promise.all([
      CouponModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      CouponModel.countDocuments(query),
    ]);
    req.rData = { page: Number(page), limit: Number(limit), total, coupons };
    next();
  };

  const getCouponById = async (req, res, next) => {
    const coupon = await CouponModel.findById(req.params.id);
    if (!coupon) { req.rCode = 5; req.msg = "not_found"; return next(); }
    req.rData = coupon;
    next();
  };

  const createCoupon = async (req, res, next) => {
    const { code, title, description, discountType, discountValue, maxDiscountAmount,
      minOrderValue, startDate, endDate, applicableFor, specificUserMobile,
      paymentMode, maxUsagePerUser, maxTotalUsage } = req.body;
    let image = "";
    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      image = result.images;
    }
    const coupon = await CouponModel.create({
      code: code ? code.toUpperCase() : "",
      title, description, image, discountType, discountValue, maxDiscountAmount,
      minOrderValue, startDate, endDate, applicableFor, specificUserMobile,
      paymentMode, maxUsagePerUser, maxTotalUsage,
      isActive: true,
    });
    req.rData = coupon;
    req.msg = "success";
    next();
  };

  const updateCoupon = async (req, res, next) => {
    const update = { ...req.body };
    if (update.code) update.code = update.code.toUpperCase();
    if (req.files && req.files.image) {
      const result = await uploadFileToAws(req.files.image);
      update.image = result.images;
    }
    const coupon = await CouponModel.findByIdAndUpdate(req.params.id, update, { new: true });
    req.rData = coupon;
    req.msg = "success";
    next();
  };

  const deleteCoupon = async (req, res, next) => {
    await CouponModel.findByIdAndUpdate(req.params.id, { isDeleted: true });
    req.msg = "success";
    next();
  };

  const toggleCouponStatus = async (req, res, next) => {
    const coupon = await CouponModel.findById(req.params.id);
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    req.rData = { isActive: coupon.isActive };
    next();
  };

  return {
    getDashboardStats,
    getSalesChart,
    updateAdminProfile,
    getRecentOrders,
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    toggleProductFeatured,
    getUsers,
    getUserById,
    toggleUserStatus,
    getAbandonedCarts,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getPayments,
    getPaymentStats,
    // Banners
    getBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    // Subcategories
    getSubCategories,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    toggleSubCategoryStatus,
    // Customer Reviews
    getCustomerReviews,
    getCustomerReviewById,
    createCustomerReview,
    updateCustomerReview,
    deleteCustomerReview,
    toggleCustomerReviewStatus,
    // Reels
    getReels,
    getReelById,
    createReel,
    updateReel,
    deleteReel,
    toggleReelStatus,
    // Coupons
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};
