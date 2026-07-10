const userRouter = require("express").Router();
const UserController = require("../controllers/UserController");
const HomeScreenController = require("../controllers/HomeScreenController");
const ProductController = require("../controllers/ProductController");
const WishlistController = require("../controllers/WishlistController");
const CartController = require("../controllers/CartController");
const OrderController = require("../controllers/OrderController");
const ReviewController = require("../controllers/ReviewController");
const AppConfigController = require("../controllers/AppConfigController");
const NotificationController = require("../controllers/NotificationController");
const ChargeConfigController = require("../controllers/ChargeConfigController");
const ContactController = require("../controllers/ContactController");
const StaticPageController = require("../controllers/StaticPageController");
const ErrorHandlerMiddleware = require("../middlewares/ErrorHandlerMiddleware");
const ResponseMiddleware = require("../middlewares/ResponseMiddleware");
const AuthMiddleware = require("../middlewares/AuthMiddleware");
const UsersValidator = require("../validators/UsersValidator");

// =====================================================
// APP CONFIG (returns API keys for mobile app)
// =====================================================
userRouter.get(
  "/app-config",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(AppConfigController().getAppConfig),
  ResponseMiddleware,
);

// Public charges rules — used by Cart / Checkout to preview the breakdown.
userRouter.get(
  "/charges",
  ErrorHandlerMiddleware(ChargeConfigController().getPublicConfig),
  ResponseMiddleware,
);

// =====================================================
// HOME SCREEN
// =====================================================
userRouter.get(
  "/homeScreen",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(HomeScreenController().homeScreen),
  ResponseMiddleware,
);

userRouter.get(
  "/gold-prices",
  ErrorHandlerMiddleware(HomeScreenController().getGoldPrices),
  ResponseMiddleware,
);

userRouter.get(
  "/banners",
  ErrorHandlerMiddleware(HomeScreenController().getBanners),
  ResponseMiddleware,
);

userRouter.get(
  "/customer-reviews",
  ErrorHandlerMiddleware(HomeScreenController().getCustomerReviews),
  ResponseMiddleware,
);

userRouter.get(
  "/reels",
  ErrorHandlerMiddleware(HomeScreenController().getReels),
  ResponseMiddleware,
);

// Support/Contact Info (public)
userRouter.get(
  "/support-info",
  ErrorHandlerMiddleware(HomeScreenController().getSupportInfo),
  ResponseMiddleware,
);

// Contact form (public) — anyone can submit, no auth required.
userRouter.post(
  "/contact",
  ErrorHandlerMiddleware(ContactController().submit),
  ResponseMiddleware,
);

// Static page CMS (public read).
userRouter.get(
  "/pages",
  ErrorHandlerMiddleware(StaticPageController().listPublic),
  ResponseMiddleware,
);
userRouter.get(
  "/pages/:slug",
  ErrorHandlerMiddleware(StaticPageController().getPublic),
  ResponseMiddleware,
);

// Global search – categories + products (public)
userRouter.get(
  "/search",
  ErrorHandlerMiddleware(HomeScreenController().globalSearch),
  ResponseMiddleware,
);

// Home screen categories (showOnHomeScreen = true)
userRouter.get(
  "/home-categories",
  ErrorHandlerMiddleware(HomeScreenController().getHomeCategories),
  ResponseMiddleware,
);

// Special offers (featured products)
userRouter.get(
  "/special-offers",
  ErrorHandlerMiddleware(HomeScreenController().getSpecialOffers),
  ResponseMiddleware,
);

// =====================================================
// USER PROFILE
// =====================================================
userRouter.get(
  "/profile",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(UserController().getDetails),
  ResponseMiddleware,
);

userRouter.put(
  "/profile",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(UserController().editUser),
  ResponseMiddleware,
);

// =====================================================
// ADDRESS MANAGEMENT
// =====================================================
userRouter.post(
  "/address",
  AuthMiddleware().verifyUserToken,
  UsersValidator().validateAddress,
  ErrorHandlerMiddleware(UserController().addUserAddress),
  ResponseMiddleware,
);

userRouter.get(
  "/address",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(UserController().getUserAddress),
  ResponseMiddleware,
);

userRouter.get(
  "/address/:id",
  AuthMiddleware().verifyUserToken,
  UsersValidator().validateAddressId,
  ErrorHandlerMiddleware(UserController().getUserAddressDetail),
  ResponseMiddleware,
);

userRouter.delete(
  "/address/:id",
  AuthMiddleware().verifyUserToken,
  UsersValidator().validateAddressId,
  ErrorHandlerMiddleware(UserController().deleteUserAddress),
  ResponseMiddleware,
);

userRouter.put(
  "/address/:id",
  AuthMiddleware().verifyUserToken,
  UsersValidator().validateAddressId,
  ErrorHandlerMiddleware(UserController().selectAddress),
  ResponseMiddleware,
);

// =====================================================
// NOTIFICATIONS
// =====================================================
userRouter.get(
  "/notifications/switch",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(UserController().activateDeactivateNotification),
  ResponseMiddleware,
);

userRouter.get(
  "/notifications",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(NotificationController().listMine),
  ResponseMiddleware,
);

userRouter.get(
  "/notifications/unread-count",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(NotificationController().unreadCount),
  ResponseMiddleware,
);

userRouter.patch(
  "/notifications/read-all",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(NotificationController().markAllRead),
  ResponseMiddleware,
);

userRouter.patch(
  "/notifications/:id/read",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(NotificationController().markRead),
  ResponseMiddleware,
);

// =====================================================
// CATEGORIES
// =====================================================
userRouter.get(
  "/categories",
  ErrorHandlerMiddleware(ProductController().getAllCategories),
  ResponseMiddleware,
);

userRouter.get(
  "/subcategories",
  ErrorHandlerMiddleware(ProductController().getSubCategoriesPublic),
  ResponseMiddleware,
);

userRouter.get(
  "/categories/:id",
  ErrorHandlerMiddleware(ProductController().getCategoryById),
  ResponseMiddleware,
);

userRouter.get(
  "/categories/:id/products",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ProductController().getProductsByCategory),
  ResponseMiddleware,
);

// =====================================================
// PRODUCTS
// =====================================================
// Public catalog reads — guests can search/browse; wishlist flags added when
// logged in (optionalUserToken sets userId only if a valid token is present).
userRouter.get(
  "/products/search",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().searchProducts),
  ResponseMiddleware,
);

// Camera search — photo upload (multipart), so POST rather than GET.
userRouter.post(
  "/products/image-search",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().imageSearchProducts),
  ResponseMiddleware,
);

userRouter.get(
  "/products/new-arrivals",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().getNewArrivals),
  ResponseMiddleware,
);

userRouter.get(
  "/products/featured",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().getFeaturedProducts),
  ResponseMiddleware,
);

// Public browse/filter (guests allowed; wishlist flags added when logged in).
userRouter.get(
  "/products/browse",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().browseProducts),
  ResponseMiddleware,
);

// Public product detail (guests can view; wishlist flag added when logged in).
userRouter.get(
  "/products/:id",
  AuthMiddleware().optionalUserToken,
  ErrorHandlerMiddleware(ProductController().getProductDetails),
  ResponseMiddleware,
);

userRouter.get(
  "/products/:id/reviews",
  ErrorHandlerMiddleware(ReviewController().getProductReviews),
  ResponseMiddleware,
);

// =====================================================
// WISHLIST
// =====================================================
userRouter.get(
  "/wishlist",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().getWishlist),
  ResponseMiddleware,
);

userRouter.post(
  "/wishlist",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().addToWishlist),
  ResponseMiddleware,
);

userRouter.post(
  "/wishlist/toggle",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().toggleWishlist),
  ResponseMiddleware,
);

userRouter.delete(
  "/wishlist/:productId",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().removeFromWishlist),
  ResponseMiddleware,
);

userRouter.delete(
  "/wishlist",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().clearWishlist),
  ResponseMiddleware,
);

userRouter.get(
  "/wishlist/count",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(WishlistController().getWishlistCount),
  ResponseMiddleware,
);

// =====================================================
// CART
// =====================================================
userRouter.get(
  "/cart",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().getCart),
  ResponseMiddleware,
);

userRouter.post(
  "/cart",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().addToCart),
  ResponseMiddleware,
);

userRouter.put(
  "/cart/:itemId",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().updateCartItem),
  ResponseMiddleware,
);

userRouter.delete(
  "/cart/:itemId",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().removeFromCart),
  ResponseMiddleware,
);

userRouter.delete(
  "/cart",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().clearCart),
  ResponseMiddleware,
);

userRouter.get(
  "/cart/count",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().getCartCount),
  ResponseMiddleware,
);

// =====================================================
// COUPONS
// =====================================================
userRouter.get(
  "/coupons",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().getAvailableCoupons),
  ResponseMiddleware,
);

userRouter.post(
  "/cart/apply-coupon",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().applyCoupon),
  ResponseMiddleware,
);

userRouter.delete(
  "/cart/remove-coupon",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(CartController().removeCoupon),
  ResponseMiddleware,
);

// =====================================================
// ORDERS
// =====================================================
userRouter.post(
  "/orders",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().placeOrder),
  ResponseMiddleware,
);

userRouter.get(
  "/orders",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().getOrders),
  ResponseMiddleware,
);

userRouter.get(
  "/orders/:id",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().getOrderDetails),
  ResponseMiddleware,
);

userRouter.get(
  "/orders/:id/track",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().trackOrder),
  ResponseMiddleware,
);

userRouter.post(
  "/orders/:id/cancel",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().cancelOrder),
  ResponseMiddleware,
);

userRouter.post(
  "/orders/:id/reorder",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().reorder),
  ResponseMiddleware,
);

// =====================================================
// PAYMENT
// =====================================================
userRouter.post(
  "/payment/verify",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(OrderController().verifyPayment),
  ResponseMiddleware,
);

// =====================================================
// REVIEWS
// =====================================================
userRouter.post(
  "/reviews",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ReviewController().submitReview),
  ResponseMiddleware,
);

userRouter.get(
  "/reviews",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ReviewController().getUserReviews),
  ResponseMiddleware,
);

userRouter.get(
  "/reviews/can-review/:productId",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ReviewController().canReview),
  ResponseMiddleware,
);

userRouter.put(
  "/reviews/:id",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ReviewController().updateReview),
  ResponseMiddleware,
);

userRouter.delete(
  "/reviews/:id",
  AuthMiddleware().verifyUserToken,
  ErrorHandlerMiddleware(ReviewController().deleteReview),
  ResponseMiddleware,
);

module.exports = userRouter;
