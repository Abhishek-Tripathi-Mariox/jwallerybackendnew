const express = require("express");
const adminRouter = express.Router();
const AdminValidator = require("../validators/AdminValidator");
const AdminAuthController = require("../controllers/AdminAuthController");
const AdminController = require("../controllers/AdminController");
const SystemConfigController = require("../controllers/SystemConfigController");
const RoleController = require("../controllers/RoleController");
const StaffController = require("../controllers/StaffController");
const LogoController = require("../controllers/LogoController");
const GoldRateMarkupController = require("../controllers/GoldRateMarkupController");
const NotificationController = require("../controllers/NotificationController");
const ChargeConfigController = require("../controllers/ChargeConfigController");
const ContactController = require("../controllers/ContactController");
const StaticPageController = require("../controllers/StaticPageController");
const ErrorHandlerMiddleware = require("../middlewares/ErrorHandlerMiddleware");
const ResponseMiddleware = require("../middlewares/ResponseMiddleware");
const AuthMiddleware = require("../middlewares/AuthMiddleware");

// Public routes
adminRouter.post(
  "/auth/login",
  AdminValidator().validateLogin,
  ErrorHandlerMiddleware(AdminAuthController().login),
  ResponseMiddleware,
);

adminRouter.post(
  "/auth/forgot-password",
  AdminValidator().validateForgotPassword,
  ErrorHandlerMiddleware(AdminAuthController().forgotPassword),
  ResponseMiddleware,
);

adminRouter.post(
  "/auth/verify-otp",
  AdminValidator().validateVerifyOtp,
  ErrorHandlerMiddleware(AdminAuthController().verifyOtp),
  ResponseMiddleware,
);

adminRouter.post(
  "/auth/reset-password",
  AdminValidator().validateResetPassword,
  ErrorHandlerMiddleware(AdminAuthController().resetPassword),
  ResponseMiddleware,
);

// Protected routes (require admin authentication)
adminRouter.put(
  "/auth/change-password",
  AuthMiddleware().verifyAdminToken,
  AdminValidator().validateChangePassword,
  ErrorHandlerMiddleware(AdminAuthController().changePassword),
  ResponseMiddleware,
);

adminRouter.get(
  "/profile",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminAuthController().getProfile),
  ResponseMiddleware,
);

adminRouter.post(
  "/auth/logout",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminAuthController().logout),
  ResponseMiddleware,
);

// ==================== DASHBOARD ====================
adminRouter.get(
  "/dashboard/stats",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getDashboardStats),
  ResponseMiddleware,
);

adminRouter.get(
  "/dashboard/recent-orders",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getRecentOrders),
  ResponseMiddleware,
);

adminRouter.get(
  "/dashboard/sales-chart",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getSalesChart),
  ResponseMiddleware,
);

adminRouter.put(
  "/profile",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateAdminProfile),
  ResponseMiddleware,
);

// ==================== CATEGORIES ====================
adminRouter.get(
  "/categories",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCategories),
  ResponseMiddleware,
);

adminRouter.get(
  "/categories/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCategoryById),
  ResponseMiddleware,
);

adminRouter.post(
  "/categories",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createCategory),
  ResponseMiddleware,
);

adminRouter.put(
  "/categories/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateCategory),
  ResponseMiddleware,
);

adminRouter.delete(
  "/categories/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteCategory),
  ResponseMiddleware,
);

adminRouter.patch(
  "/categories/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleCategoryStatus),
  ResponseMiddleware,
);

// ==================== SUBCATEGORIES ====================
adminRouter.get(
  "/subcategories",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getSubCategories),
  ResponseMiddleware,
);

adminRouter.post(
  "/subcategories",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createSubCategory),
  ResponseMiddleware,
);

adminRouter.put(
  "/subcategories/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateSubCategory),
  ResponseMiddleware,
);

adminRouter.delete(
  "/subcategories/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteSubCategory),
  ResponseMiddleware,
);

adminRouter.patch(
  "/subcategories/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleSubCategoryStatus),
  ResponseMiddleware,
);

// ==================== PRODUCTS ====================
adminRouter.get(
  "/products",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getProducts),
  ResponseMiddleware,
);

adminRouter.get(
  "/products/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getProductById),
  ResponseMiddleware,
);

adminRouter.post(
  "/products",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createProduct),
  ResponseMiddleware,
);

adminRouter.put(
  "/products/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateProduct),
  ResponseMiddleware,
);

adminRouter.delete(
  "/products/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteProduct),
  ResponseMiddleware,
);

adminRouter.patch(
  "/products/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleProductStatus),
  ResponseMiddleware,
);

adminRouter.patch(
  "/products/:id/featured",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleProductFeatured),
  ResponseMiddleware,
);

// ==================== USERS ====================
adminRouter.get(
  "/users",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getUsers),
  ResponseMiddleware,
);

// "Added but Not Bought" — abandoned carts list
adminRouter.get(
  "/abandoned-carts",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getAbandonedCarts),
  ResponseMiddleware,
);

adminRouter.get(
  "/users/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getUserById),
  ResponseMiddleware,
);

adminRouter.patch(
  "/users/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleUserStatus),
  ResponseMiddleware,
);

// ==================== ORDERS ====================
adminRouter.get(
  "/orders",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getOrders),
  ResponseMiddleware,
);

adminRouter.get(
  "/orders/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getOrderById),
  ResponseMiddleware,
);

adminRouter.patch(
  "/orders/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateOrderStatus),
  ResponseMiddleware,
);

// COD orders — mark cash collected. Online payments should never use this;
// their paymentStatus is driven by Razorpay verification/webhook instead.
adminRouter.patch(
  "/orders/:id/payment-received",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().markOrderPaymentReceived),
  ResponseMiddleware,
);

// ==================== PAYMENTS ====================
adminRouter.get(
  "/payments",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getPayments),
  ResponseMiddleware,
);

adminRouter.get(
  "/payments/stats",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getPaymentStats),
  ResponseMiddleware,
);

// ==================== BANNERS ====================
adminRouter.get(
  "/banners",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getBanners),
  ResponseMiddleware,
);

adminRouter.get(
  "/banners/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getBannerById),
  ResponseMiddleware,
);

adminRouter.post(
  "/banners",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createBanner),
  ResponseMiddleware,
);

adminRouter.put(
  "/banners/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateBanner),
  ResponseMiddleware,
);

adminRouter.delete(
  "/banners/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteBanner),
  ResponseMiddleware,
);

adminRouter.patch(
  "/banners/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleBannerStatus),
  ResponseMiddleware,
);

// ==================== STORES (Store Locator) ====================
adminRouter.get(
  "/stores",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getStores),
  ResponseMiddleware,
);

adminRouter.get(
  "/stores/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getStoreById),
  ResponseMiddleware,
);

adminRouter.post(
  "/stores",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createStore),
  ResponseMiddleware,
);

adminRouter.put(
  "/stores/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateStore),
  ResponseMiddleware,
);

adminRouter.delete(
  "/stores/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteStore),
  ResponseMiddleware,
);

adminRouter.patch(
  "/stores/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleStoreStatus),
  ResponseMiddleware,
);

// ==================== CUSTOMER REVIEWS ====================
adminRouter.get(
  "/customer-reviews",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCustomerReviews),
  ResponseMiddleware,
);

adminRouter.get(
  "/customer-reviews/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCustomerReviewById),
  ResponseMiddleware,
);

adminRouter.post(
  "/customer-reviews",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createCustomerReview),
  ResponseMiddleware,
);

adminRouter.put(
  "/customer-reviews/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateCustomerReview),
  ResponseMiddleware,
);

adminRouter.delete(
  "/customer-reviews/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteCustomerReview),
  ResponseMiddleware,
);

adminRouter.patch(
  "/customer-reviews/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleCustomerReviewStatus),
  ResponseMiddleware,
);

// ==================== REELS ====================
adminRouter.get(
  "/reels",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getReels),
  ResponseMiddleware,
);

adminRouter.get(
  "/reels/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getReelById),
  ResponseMiddleware,
);

adminRouter.post(
  "/reels",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createReel),
  ResponseMiddleware,
);

adminRouter.put(
  "/reels/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateReel),
  ResponseMiddleware,
);

adminRouter.delete(
  "/reels/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteReel),
  ResponseMiddleware,
);

adminRouter.patch(
  "/reels/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleReelStatus),
  ResponseMiddleware,
);

// ==================== COUPONS ====================
adminRouter.get(
  "/coupons",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCoupons),
  ResponseMiddleware,
);

adminRouter.get(
  "/coupons/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().getCouponById),
  ResponseMiddleware,
);

adminRouter.post(
  "/coupons",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().createCoupon),
  ResponseMiddleware,
);

adminRouter.put(
  "/coupons/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().updateCoupon),
  ResponseMiddleware,
);

adminRouter.delete(
  "/coupons/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().deleteCoupon),
  ResponseMiddleware,
);

adminRouter.patch(
  "/coupons/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(AdminController().toggleCouponStatus),
  ResponseMiddleware,
);

// ==================== SYSTEM CONFIG ====================
adminRouter.get(
  "/system-config/sms",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getSmsConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/sms",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveSmsConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/sms/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleSmsStatus),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/sms/test",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().testSms),
  ResponseMiddleware,
);

adminRouter.get(
  "/system-config/email",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getEmailConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/email",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveEmailConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/email/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleEmailStatus),
  ResponseMiddleware,
);

// ==================== PAYMENT CONFIG ====================
adminRouter.get(
  "/system-config/payment",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getPaymentConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/payment",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().savePaymentConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/payment/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().togglePaymentStatus),
  ResponseMiddleware,
);

// ==================== GOOGLE MAPS CONFIG ====================
adminRouter.get(
  "/system-config/google-maps",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getGoogleMapsConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/google-maps",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveGoogleMapsConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/google-maps/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleGoogleMapsStatus),
  ResponseMiddleware,
);

// Raw (unmasked) key, for embedding the Maps JS SDK in the admin panel.
adminRouter.get(
  "/system-config/google-maps/key",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getGoogleMapsKey),
  ResponseMiddleware,
);

// ==================== FIREBASE CONFIG ====================
adminRouter.get(
  "/system-config/firebase",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getFirebaseConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/firebase",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveFirebaseConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/firebase/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleFirebaseStatus),
  ResponseMiddleware,
);

// ==================== FIREBASE ADMIN (server push credential) ====================
adminRouter.get(
  "/system-config/firebase-admin",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getFirebaseAdminConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/firebase-admin",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveFirebaseAdminConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/firebase-admin/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleFirebaseAdminStatus),
  ResponseMiddleware,
);

// ==================== SUPPORT CONTACT CONFIG ====================
adminRouter.get(
  "/system-config/support",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().getSupportConfig),
  ResponseMiddleware,
);

adminRouter.post(
  "/system-config/support",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().saveSupportConfig),
  ResponseMiddleware,
);

adminRouter.patch(
  "/system-config/support/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SystemConfigController().toggleSupportStatus),
  ResponseMiddleware,
);

// ==================== ROLES ====================
adminRouter.get(
  "/roles",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().getRoles),
  ResponseMiddleware,
);

adminRouter.get(
  "/roles/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().getRoleById),
  ResponseMiddleware,
);

adminRouter.post(
  "/roles",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().createRole),
  ResponseMiddleware,
);

adminRouter.put(
  "/roles/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().updateRole),
  ResponseMiddleware,
);

adminRouter.delete(
  "/roles/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().deleteRole),
  ResponseMiddleware,
);

adminRouter.patch(
  "/roles/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(RoleController().toggleRoleStatus),
  ResponseMiddleware,
);

// ==================== STAFF ====================
adminRouter.get(
  "/staff",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().getStaff),
  ResponseMiddleware,
);

adminRouter.get(
  "/staff/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().getStaffById),
  ResponseMiddleware,
);

adminRouter.post(
  "/staff",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().createStaff),
  ResponseMiddleware,
);

adminRouter.put(
  "/staff/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().updateStaff),
  ResponseMiddleware,
);

adminRouter.delete(
  "/staff/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().deleteStaff),
  ResponseMiddleware,
);

adminRouter.patch(
  "/staff/:id/status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaffController().toggleStaffStatus),
  ResponseMiddleware,
);

// ==================== LOGOS ====================
adminRouter.get(
  "/logos",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(LogoController().getLogos),
  ResponseMiddleware,
);

adminRouter.post(
  "/logos",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(LogoController().uploadLogo),
  ResponseMiddleware,
);

adminRouter.delete(
  "/logos/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(LogoController().deleteLogo),
  ResponseMiddleware,
);

// ==================== GOLD RATE MARKUP ====================
adminRouter.get(
  "/gold-rate-markup",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(GoldRateMarkupController().getMarkups),
  ResponseMiddleware,
);

adminRouter.put(
  "/gold-rate-markup/:karat",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(GoldRateMarkupController().upsertMarkup),
  ResponseMiddleware,
);

// ==================== NOTIFICATIONS ====================
adminRouter.get(
  "/notifications",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(NotificationController().adminList),
  ResponseMiddleware,
);

adminRouter.post(
  "/notifications",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(NotificationController().adminSend),
  ResponseMiddleware,
);

// ==================== CHARGE CONFIG (shipping + platform fee) ====================
adminRouter.get(
  "/charges",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(ChargeConfigController().getConfig),
  ResponseMiddleware,
);

adminRouter.put(
  "/charges",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(ChargeConfigController().updateConfig),
  ResponseMiddleware,
);

// ==================== CONTACT SUBMISSIONS ====================
adminRouter.get(
  "/contact-submissions",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(ContactController().adminList),
  ResponseMiddleware,
);

adminRouter.patch(
  "/contact-submissions/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(ContactController().adminUpdate),
  ResponseMiddleware,
);

adminRouter.delete(
  "/contact-submissions/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(ContactController().adminDelete),
  ResponseMiddleware,
);

// ==================== STATIC PAGES (CMS) ====================
adminRouter.get(
  "/pages",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaticPageController().adminList),
  ResponseMiddleware,
);
adminRouter.get(
  "/pages/:slug",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaticPageController().adminGet),
  ResponseMiddleware,
);
adminRouter.put(
  "/pages",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaticPageController().adminUpsert),
  ResponseMiddleware,
);
adminRouter.delete(
  "/pages/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(StaticPageController().adminDelete),
  ResponseMiddleware,
);

module.exports = adminRouter;
