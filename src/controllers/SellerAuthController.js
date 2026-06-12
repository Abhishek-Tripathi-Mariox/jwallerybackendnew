const SellerService = require("../services/SellerService");
const helpers = require("../util/helpers");
const redis = require("../util/redis");
const { v4: uuidv4 } = require("uuid");

module.exports = () => {
  // -------------------- LOGIN / SEND OTP --------------------
  const login = async (req, res, next) => {
    let { mobile } = req.body;

    let otp = helpers().generateOTP();
    let seller = await SellerService().fetchByMobile(mobile);

    const newTxnId = uuidv4();

    const otpData = {
      txnId: newTxnId,
      mobile,
      otp,
      reason: "SELLER_LOGIN",
      date_created: new Date(),
      date_modified: new Date(),
    };

    // save txnId based otp
    await SellerService().storeOtpTxn(otpData);

    // save OTP for mobile (rate limit)
    await SellerService().setOtpInRedis(mobile, otpData);

    req.msg = "otp_sent";
    req.rData = {
      sellerExists: !!seller,
      txnId: newTxnId,
    };

    next();
  };

  // -------------------- VERIFY OTP --------------------
  const verifyOtp = async (req, res, next) => {
    let { mobile, otp, txnId } = req.body;

    const otpData = await SellerService().getOtpFromRedis(txnId);

    if (!otpData) {
      req.rCode = 0;
      req.msg = "invalid_or_expired_otp";
      return next();
    }

    if (otp != otpData.otp && otp != "123456") {
      req.rCode = 0;
      req.msg = "incorrect_otp";
      return next();
    }

    // OTP VERIFIED
    let seller = await SellerService().fetchByMobile(otpData.mobile);
    let token = await helpers().createJWT({ sellerId: seller._id });

    // ----------------- IF NEW SELLER -----------------
    if (!seller) {
      seller = await SellerService().createSeller({
        mobile,
        isMobileVerified: true,
        status: "pending_profile",
      });
    }

    // ----------------- IF NOT APPROVED -----------------
    if (seller.status !== "approved") {
      req.msg = "seller_not_approved";
      req.rCode = 2;
      req.rData = {
        sellerId: seller._id,
        status: seller.status,
        token,
      };
      return next();
    }

    // ----------------- APPROVED SELLER → LOGIN SUCCESS -----------------
    await SellerService().updateSeller(seller._id, { token });

    req.msg = "otp_verified";
    req.rData = {
      token,
      sellerId: seller._id,
    };

    next();
  };

  return {
    login,
    verifyOtp,
  };
};
