const router = require("express").Router();
const SellerAuthController = require("../controllers/SellerAuthController");
const SellerController = require("../controllers/SellerController");
const ErrorHandlerMiddleware = require("../middlewares/ErrorHandlerMiddleware");
const ResponseMiddleware = require("../middlewares/ResponseMiddleware");
const AuthMiddleware = require("../middlewares/AuthMiddleware");

/**
 * --------------------- AUTH ---------------------
 */
router.post(
  "/login",
  ErrorHandlerMiddleware(SellerAuthController().login),
  ResponseMiddleware
);

router.post(
  "/verify-otp",
  ErrorHandlerMiddleware(SellerAuthController().verifyOtp),
  ResponseMiddleware
);

/**
 * --------------------- PROFILE ---------------------
 */
router.get(
  "/profile",
  AuthMiddleware().verifySellerToken,
  ErrorHandlerMiddleware(SellerController().getDetails),
  ResponseMiddleware
);

router.put(
  "/profile",
  AuthMiddleware().verifySellerToken,
  ErrorHandlerMiddleware(SellerController().editSellerProfile),
  ResponseMiddleware
);

/**
 * --------------------- KYC ---------------------
 */
router.put(
  "/kyc",
  AuthMiddleware().verifySellerToken,
  ErrorHandlerMiddleware(SellerController().updateKyc),
  ResponseMiddleware
);

/**
 * --------------------- BANK DETAILS ---------------------
 */
router.put(
  "/bank",
  AuthMiddleware().verifySellerToken,
  ErrorHandlerMiddleware(SellerController().updateBankDetails),
  ResponseMiddleware
);

/**
 * --------------------- SHOP TIMING ---------------------
 */
router.put(
  "/shop-timing",
  AuthMiddleware().verifySellerToken,
  ErrorHandlerMiddleware(SellerController().updateShopTiming),
  ResponseMiddleware
);

/**
 * --------------------- ADMIN APIs ---------------------
 */
router.get(
  "/admin/list",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().getAllSellerList),
  ResponseMiddleware
);

router.get(
  "/admin/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().getDetails),
  ResponseMiddleware
);

router.put(
  "/admin/:id/approve",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().approveSeller),
  ResponseMiddleware
);

router.put(
  "/admin/:id/reject",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().rejectSeller),
  ResponseMiddleware
);

router.put(
  "/admin/:id/toggle-status",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().activateDeactivateSeller),
  ResponseMiddleware
);

router.delete(
  "/admin/:id",
  AuthMiddleware().verifyAdminToken,
  ErrorHandlerMiddleware(SellerController().deleteSeller),
  ResponseMiddleware
);

module.exports = router;
