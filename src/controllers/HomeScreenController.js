const GoldPriceService = require("../services/GoldPriceService");
const CategoryService = require("../services/CategoryService");
const ProductService = require("../services/ProductService");
const BannerService = require("../services/BannerService");
const CustomerReviewService = require("../services/CustomerReviewService");
const ReelService = require("../services/ReelService");
const WishlistService = require("../services/WishlistService");
const SystemConfigService = require("../services/SystemConfigService");
const Store = require("../models/Store");
const { computeGoldPrice } = require("../util/goldPricing");

module.exports = () => {
  /**
   * Home Screen API - Returns all data needed for home screen
   */
  const homeScreen = async (req, res, next) => {
    console.log("HomeScreenController => homeScreen");

    const { userId } = req.body;

    try {
      // 1. Get Live Gold Prices
      const goldPrices = await GoldPriceService().getFormattedPrices();

      // 2. Get Categories
      const categoryQuery = { isActive: true, isDeleted: { $ne: true } };
      const categories = await CategoryService().getCategory(
        categoryQuery,
        1,
        10,
      );

      // 3. Get Active Banners — pull a generous limit so every section gets
      // its slot. The client groups by `section`.
      const banners = await BannerService().getActiveBanners(50);

      // 4. Get Featured Products
      const featuredQuery = {
        isActive: true,
        isDeleted: { $ne: true },
        isFeatured: true,
      };
      const featuredProducts = await ProductService().getProducts(
        featuredQuery,
        1,
        10,
        { createdAt: -1 },
      );

      // 5. Get New Arrivals
      const newArrivalsQuery = {
        isActive: true,
        isDeleted: { $ne: true },
      };
      const newArrivals = await ProductService().getProducts(
        newArrivalsQuery,
        1,
        10,
        { createdAt: -1 },
      );

      // 6. Get user's wishlist IDs (if logged in)
      let wishlistIds = [];
      if (userId) {
        wishlistIds = await WishlistService().getWishlistProductIds(userId);
      }

      // Cache the 24K rate so we don't read it once per product.
      const rate24K = (goldPrices.find((p) => p.purity === "24K")?.rate) || 0;

      const formatProduct = (product) => {
        const base = {
          _id: product._id,
          productName: product.productName,
          productImage:
            product.productImages && product.productImages.length > 0
              ? product.productImages[0].url
              : "",
          price: product.price,
          discountPrice: product.discountPrice,
          discountPercent: product.discountPercent,
          rating: product.rating,
          stock: product.stock,
          isWishlisted: wishlistIds.includes(product._id.toString()),
        };
        if (product.goldPricing && product.goldPricing.isEnabled) {
          const breakdown = computeGoldPrice({
            weightGrams: product.goldPricing.weightGrams,
            goldPurityPercent: product.goldPricing.goldPurityPercent,
            makingChargePercent: product.goldPricing.makingChargePercent,
            rate24K,
          });
          base.goldPricing = product.goldPricing;
          base.computedPrice = breakdown.price;
          base.goldBreakdown = breakdown;
        }
        return base;
      };

      const formattedFeaturedProducts = featuredProducts.map(formatProduct);
      const formattedNewArrivals = newArrivals.map(formatProduct);

      // Format categories
      const formattedCategories = categories.map((cat) => ({
        _id: cat._id,
        name: cat.categoryName,
        image: cat.image,
        description: cat.description,
      }));

      // Format banners — include section + subtitle + link so the website can
      // route each banner to the correct slot and render its CTA target.
      const formattedBanners = banners.map((banner) => ({
        _id: banner._id,
        title: banner.title,
        subtitle: banner.subtitle || "",
        section: banner.section || "home_offers",
        link: banner.link || "",
        mobileView: banner.mobileView,
        ipadView: banner.ipadView,
        desktopView: banner.desktopView,
      }));

      // Convenience grouping so the website doesn't filter on every render.
      const bannersBySection = {};
      for (const b of formattedBanners) {
        if (!bannersBySection[b.section]) bannersBySection[b.section] = [];
        bannersBySection[b.section].push(b);
      }

      req.rData = {
        // 📈 Live Gold Price Strip
        liveGoldPrice: goldPrices,

        // 💍 Jewellery Categories
        categories: formattedCategories,

        // 🎉 Banners / Special Offers (flat list — kept for back-compat)
        banners: formattedBanners,

        // Grouped by section for direct slot rendering.
        bannersBySection,

        // ⭐ Featured Products
        featuredProducts: formattedFeaturedProducts,

        // 🆕 New Arrivals
        newArrivals: formattedNewArrivals,
      };

      req.msg = "success";
    } catch (error) {
      console.error("HomeScreen Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }

    next();
  };

  /**
   * Get only gold prices (for refresh)
   */
  const getGoldPrices = async (req, res, next) => {
    console.log("HomeScreenController => getGoldPrices");

    try {
      const goldPrices = await GoldPriceService().getFormattedPrices();
      req.rData = goldPrices;
      req.msg = "success";
    } catch (error) {
      console.error("Gold Price Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }

    next();
  };

  /**
   * Get banners
   */
  const getBanners = async (req, res, next) => {
    console.log("HomeScreenController => getBanners");

    try {
      // Honor an optional ?section= filter so the website can fetch just one
      // slot (e.g. hero) without pulling everything.
      const { section } = req.query;
      const all = await BannerService().getActiveBanners(50);
      const filtered = section
        ? all.filter((b) => (b.section || "home_offers") === section)
        : all;
      req.rData = filtered;
      req.msg = "success";
    } catch (error) {
      console.error("Banners Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }

    next();
  };

  /**
   * Home screen categories (showOnHomeScreen = true)
   */
  const getHomeCategories = async (req, res, next) => {
    try {
      const Category = require("../models/Catagory");
      const categories = await Category.find({
        isActive: true,
        isDeleted: { $ne: true },
        showOnHomeScreen: { $ne: false },
      })
        .sort({ rank: 1 })
        .lean();

      req.rData = {
        categories: categories.map((cat) => ({
          _id: cat._id,
          categoryName: cat.categoryName,
          image: cat.image,
          description: cat.description,
        })),
      };
      req.msg = "success";
    } catch (error) {
      console.error("HomeCategories Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Special offers – featured / on-sale products
   */
  const getSpecialOffers = async (req, res, next) => {
    try {
      const Product = require("../models/Product");
      const products = await Product.find({
        isActive: true,
        isDeleted: { $ne: true },
        $or: [{ isFeatured: true }, { discountPercent: { $gte: 10 } }],
      })
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(20)
        .lean();

      req.rData = {
        offers: products.map((p) => ({
          _id: p._id,
          productName: p.productName,
          brand: p.brand,
          image: p.productImages?.[0]?.url || "",
          price: p.price,
          discountPrice: p.discountPrice,
          discountPercent: p.discountPercent,
          isFeatured: p.isFeatured,
        })),
      };
      req.msg = "success";
    } catch (error) {
      console.error("SpecialOffers Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Global search – searches across categories AND products
   */
  const globalSearch = async (req, res, next) => {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 1) {
        req.rData = { categories: [], products: [] };
        req.msg = "success";
        return next();
      }

      const Category = require("../models/Catagory");
      const Product = require("../models/Product");
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const [categories, products] = await Promise.all([
        Category.find({
          isActive: true,
          isDeleted: { $ne: true },
          categoryName: regex,
        })
          .sort({ rank: 1 })
          .limit(10)
          .lean(),
        Product.find({
          isActive: true,
          isDeleted: { $ne: true },
          $or: [
            { productName: regex },
            { brand: regex },
            { description: regex },
          ],
        })
          .sort({ isFeatured: -1, createdAt: -1 })
          .limit(20)
          .populate("categoryId", "categoryName")
          .lean(),
      ]);

      req.rData = {
        categories: categories.map((c) => ({
          _id: c._id,
          categoryName: c.categoryName,
          image: c.image,
        })),
        products: products.map((p) => ({
          _id: p._id,
          productName: p.productName,
          brand: p.brand,
          image: p.productImages?.[0]?.url || "",
          price: p.price,
          discountPrice: p.discountPrice,
          discountPercent: p.discountPercent,
          categoryName: p.categoryId?.categoryName || "",
        })),
      };
      req.msg = "success";
    } catch (error) {
      console.error("GlobalSearch Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Get Support/Contact Info for mobile app
   */
  const getSupportInfo = async (req, res, next) => {
    console.log("HomeScreenController => getSupportInfo");
    try {
      const config = await SystemConfigService().getSupportConfig();

      // Always return real admin-saved values only. If nothing is configured
      // yet, return empty strings so the website can hide rows instead of
      // showing fake "+91 9876543210" data.
      const credentials = (config && config.credentials) || {};

      let chatBotMessages = [];
      try {
        chatBotMessages = JSON.parse(credentials.chatBotMessages || "[]");
      } catch {
        chatBotMessages = [];
      }

      // Admin-saved values take priority; fall back to .env so support contact
      // works out of the box (call / WhatsApp / email).
      req.rData = {
        phone: credentials.phone || process.env.SUPPORT_PHONE || "",
        email: credentials.email || process.env.SUPPORT_EMAIL || "",
        whatsapp: credentials.whatsapp || process.env.SUPPORT_WHATSAPP || "",
        address: credentials.address || process.env.SUPPORT_ADDRESS || "",
        workingHours: credentials.workingHours || process.env.SUPPORT_WORKING_HOURS || "",
        chatBotMessages,
        isActive: config ? !!config.isActive : (!!process.env.SUPPORT_PHONE || !!process.env.SUPPORT_EMAIL),
      };
      req.msg = "success";
    } catch (error) {
      console.error("GetSupportInfo Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Get active store locations (public "Store Locator")
   */
  const getStoresPublic = async (req, res, next) => {
    try {
      req.rData = await Store.find({ isActive: true }).sort({ rank: 1 }).lean();
      req.msg = "success";
    } catch (error) {
      console.error("GetStoresPublic Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Get active customer reviews (public "Customer View" section)
   */
  const getCustomerReviews = async (req, res, next) => {
    try {
      req.rData = await CustomerReviewService().getActiveReviews(50);
      req.msg = "success";
    } catch (error) {
      console.error("CustomerReviews Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  /**
   * Get active Instagram reels (public "Instagram Reels" section)
   */
  const getReels = async (req, res, next) => {
    try {
      req.rData = await ReelService().getActiveReels(50);
      req.msg = "success";
    } catch (error) {
      console.error("Reels Error:", error);
      req.rCode = 0;
      req.msg = "something_went_wrong";
    }
    next();
  };

  return {
    homeScreen,
    getGoldPrices,
    getBanners,
    getHomeCategories,
    getSpecialOffers,
    globalSearch,
    getSupportInfo,
    getStoresPublic,
    getCustomerReviews,
    getReels,
  };
};
