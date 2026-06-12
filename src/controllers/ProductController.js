const CategoryService = require("../services/CategoryService");
const ProductService = require("../services/ProductService");
const WishlistService = require("../services/WishlistService");
const { decorateWithLiveRate } = require("../util/goldPricing");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Get all categories
   */
  const getAllCategories = async (req, res, next) => {
    console.log("ProductController => getAllCategories");

    let { page, limit } = req.query;
    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 50;

    const query = { isActive: true, isDeleted: { $ne: true } };

    const categories = await CategoryService().getCategory(query, page, limit);
    const total = await CategoryService().countCategory(query);

    req.rData = {
      page,
      limit,
      total,
      categories,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get category by ID with products count
   */
  const getCategoryById = async (req, res, next) => {
    console.log("ProductController => getCategoryById");

    const { id } = req.params;

    const category = await CategoryService().fetch(id);

    if (!category) {
      req.rCode = 5;
      req.msg = "category_not_found";
      return next();
    }

    req.rData = category;
    req.msg = "success";
    next();
  };

  /**
   * Get products by category
   */
  const getProductsByCategory = async (req, res, next) => {
    console.log("ProductController => getProductsByCategory");

    const { id } = req.params;
    let { page, limit, sortBy, minPrice, maxPrice } = req.query;
    const { userId } = req.body;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 20;

    let query = {
      categoryId: new ObjectId(id),
      isActive: true,
      isDeleted: { $ne: true },
    };

    // Price filter
    if (minPrice || maxPrice) {
      query.discountPrice = {};
      if (minPrice) query.discountPrice.$gte = parseInt(minPrice);
      if (maxPrice) query.discountPrice.$lte = parseInt(maxPrice);
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (sortBy === "price_low") sort = { discountPrice: 1 };
    if (sortBy === "price_high") sort = { discountPrice: -1 };
    if (sortBy === "rating") sort = { rating: -1 };
    if (sortBy === "newest") sort = { createdAt: -1 };

    const products = await ProductService().getProducts(
      query,
      page,
      limit,
      sort,
    );
    const total = await ProductService().countProducts(query);

    // Get user's wishlist to mark items
    let wishlistIds = [];
    if (userId) {
      wishlistIds = await WishlistService().getWishlistProductIds(userId);
    }

    // Add isWishlisted flag
    const productsWithWishlist = products.map((product) => ({
      ...(product.toObject ? product.toObject() : product),
      isWishlisted: wishlistIds.includes(product._id.toString()),
    }));

    // Decorate gold-priced items with the live 24K rate so cards show the
    // current computed price instead of the static fallback.
    await decorateWithLiveRate(productsWithWishlist);

    req.rData = {
      page,
      limit,
      total,
      products: productsWithWishlist,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get product details
   */
  const getProductDetails = async (req, res, next) => {
    console.log("ProductController => getProductDetails");

    const { id } = req.params;
    const { userId } = req.body;

    const productArr = await ProductService().fetchById(id);

    if (!productArr || productArr.length === 0) {
      req.rCode = 5;
      req.msg = "product_not_found";
      return next();
    }

    const product = productArr[0];

    // Check if in wishlist
    let isWishlisted = false;
    if (userId) {
      const wishlistItem = await WishlistService().checkExists(userId, id);
      isWishlisted = !!wishlistItem;
    }

    const decorated = { ...product, isWishlisted };
    await decorateWithLiveRate(decorated);

    req.rData = decorated;
    req.msg = "success";
    next();
  };

  /**
   * Search products
   */
  const searchProducts = async (req, res, next) => {
    console.log("ProductController => searchProducts");

    let { q, page, limit, categoryId, minPrice, maxPrice, sortBy } = req.query;
    const { userId } = req.body;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 20;

    let query = {
      isActive: true,
      isDeleted: { $ne: true },
    };

    // Search query
    if (q) {
      query.$or = [
        { productName: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
      ];
    }

    // Category filter
    if (categoryId) {
      query.categoryId = new ObjectId(categoryId);
    }

    // Price filter
    if (minPrice || maxPrice) {
      query.discountPrice = {};
      if (minPrice) query.discountPrice.$gte = parseInt(minPrice);
      if (maxPrice) query.discountPrice.$lte = parseInt(maxPrice);
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (sortBy === "price_low") sort = { discountPrice: 1 };
    if (sortBy === "price_high") sort = { discountPrice: -1 };
    if (sortBy === "rating") sort = { rating: -1 };
    if (sortBy === "newest") sort = { createdAt: -1 };

    const products = await ProductService().getProducts(
      query,
      page,
      limit,
      sort,
    );
    const total = await ProductService().countProducts(query);

    // Get user's wishlist
    let wishlistIds = [];
    if (userId) {
      wishlistIds = await WishlistService().getWishlistProductIds(userId);
    }

    const productsWithWishlist = products.map((product) => ({
      ...(product.toObject ? product.toObject() : product),
      isWishlisted: wishlistIds.includes(product._id.toString()),
    }));
    await decorateWithLiveRate(productsWithWishlist);

    req.rData = {
      query: q,
      page,
      limit,
      total,
      products: productsWithWishlist,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get new arrivals
   */
  const getNewArrivals = async (req, res, next) => {
    console.log("ProductController => getNewArrivals");

    let { page, limit } = req.query;
    const { userId } = req.body;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 20;

    const query = {
      isActive: true,
      isDeleted: { $ne: true },
    };

    const products = await ProductService().getProducts(query, page, limit, {
      createdAt: -1,
    });
    const total = await ProductService().countProducts(query);

    let wishlistIds = [];
    if (userId) {
      wishlistIds = await WishlistService().getWishlistProductIds(userId);
    }

    const productsWithWishlist = products.map((product) => ({
      ...(product.toObject ? product.toObject() : product),
      isWishlisted: wishlistIds.includes(product._id.toString()),
    }));
    await decorateWithLiveRate(productsWithWishlist);

    req.rData = {
      page,
      limit,
      total,
      products: productsWithWishlist,
    };
    req.msg = "success";
    next();
  };

  /**
   * Get featured products
   */
  const getFeaturedProducts = async (req, res, next) => {
    console.log("ProductController => getFeaturedProducts");

    let { limit } = req.query;
    const { userId } = req.body;

    limit = limit ? parseInt(limit) : 10;

    const query = {
      isActive: true,
      isDeleted: { $ne: true },
      isFeatured: true,
    };

    const products = await ProductService().getProducts(query, 1, limit, {
      createdAt: -1,
    });

    let wishlistIds = [];
    if (userId) {
      wishlistIds = await WishlistService().getWishlistProductIds(userId);
    }

    const productsWithWishlist = products.map((product) => ({
      ...(product.toObject ? product.toObject() : product),
      isWishlisted: wishlistIds.includes(product._id.toString()),
    }));
    await decorateWithLiveRate(productsWithWishlist);

    req.rData = productsWithWishlist;
    req.msg = "success";
    next();
  };

  /**
   * Public product browse/filter endpoint (no login required).
   * Supports filtering by one or more categories, price range, sort and
   * pagination. Used by the website's filter page.
   */
  const browseProducts = async (req, res, next) => {
    console.log("ProductController => browseProducts");

    let { page, limit, sortBy, minPrice, maxPrice, categoryIds, materials, brands } =
      req.query;
    const { userId } = req.body || {};

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 24;

    const query = { isActive: true, isDeleted: { $ne: true } };

    // Category filter — accept a comma-separated list of valid ObjectIds.
    if (categoryIds) {
      const ids = String(categoryIds)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[a-f0-9]{24}$/i.test(s))
        .map((s) => new ObjectId(s));
      if (ids.length) query.categoryId = { $in: ids };
    }

    // Material filter (e.g. "22K Gold", "Pearl") — comma-separated.
    if (materials) {
      const list = String(materials).split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) query.material = { $in: list };
    }

    // Brand filter — comma-separated.
    if (brands) {
      const list = String(brands).split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) query.brand = { $in: list };
    }

    // Price filter (open-ended on either side).
    if (minPrice || maxPrice) {
      query.discountPrice = {};
      if (minPrice) query.discountPrice.$gte = parseInt(minPrice);
      if (maxPrice) query.discountPrice.$lte = parseInt(maxPrice);
    }

    let sort = { createdAt: -1 };
    if (sortBy === "price_low") sort = { discountPrice: 1 };
    if (sortBy === "price_high") sort = { discountPrice: -1 };
    if (sortBy === "rating") sort = { rating: -1 };

    const products = await ProductService().getProducts(query, page, limit, sort);
    const total = await ProductService().countProducts(query);

    let wishlistIds = [];
    if (userId) {
      wishlistIds = await WishlistService().getWishlistProductIds(userId);
    }

    const productsWithWishlist = products.map((product) => ({
      ...(product.toObject ? product.toObject() : product),
      isWishlisted: wishlistIds.includes(product._id.toString()),
    }));
    await decorateWithLiveRate(productsWithWishlist);

    req.rData = { page, limit, total, products: productsWithWishlist };
    req.msg = "success";
    next();
  };

  /** Public active subcategories, optionally filtered by ?categoryId=. */
  const getSubCategoriesPublic = async (req, res, next) => {
    const SubCategoryService = require("../services/SubCategoryService");
    const { categoryId } = req.query;
    req.rData = await SubCategoryService().getActive(categoryId || undefined);
    req.msg = "success";
    next();
  };

  return {
    getAllCategories,
    getCategoryById,
    getProductsByCategory,
    browseProducts,
    getSubCategoriesPublic,
    getProductDetails,
    searchProducts,
    getNewArrivals,
    getFeaturedProducts,
  };
};
