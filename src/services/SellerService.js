const Seller = require("../models/Seller");
const redis = require("../util/redis");
const helpers = require("../util/helpers");

module.exports = () => {
  // ---------------- ADD SELLER ----------------
  const addSeller = (data) => {
    return new Promise(function (resolve, reject) {
      Seller.create(data).then(resolve).catch(reject);
    });
  };

  // ---------------- FETCH BY ID ----------------
  const fetch = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Seller.findById(id);
      orm.then(resolve).catch(reject);
    });
  };

  // ---------------- FETCH BY QUERY ----------------
  const fetchByQuery = (query) => {
    console.log("SellerService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = Seller.findOne(query);
      orm.then(resolve).catch(reject);
    });
  };

  // ---------------- DELETE SELLER ----------------
  const deleteSeller = (sellerId) => {
    return new Promise(function (resolve, reject) {
      let orm = Seller.deleteOne({ _id: sellerId });
      orm.then(resolve).catch(reject);
    });
  };

  // ---------------- GET SELLERS WITH PAGINATION ----------------
  const getSellers = (query, page, limit) => {
    return new Promise(function (resolve, reject) {
      let orm = Seller.find(query)
        .sort({ _id: -1 })
        .skip(page * limit)
        .limit(limit);

      orm.then(resolve).catch(reject);
    });
  };

  // ---------------- COUNT SELLERS ----------------
  const countSellers = (query) => {
    return new Promise(function (resolve, reject) {
      let orm = Seller.countDocuments(query);
      orm.then(resolve).catch(reject);
    });
  };

  // ---------------- OTP STORE IN REDIS ----------------
  const setSellerOtpInRedis = async (mobile, otpData) => {
    try {
      let redisKey = `SELLER_MOB_${mobile}`;
      let exists = await redis().GetKeyRedis(redisKey);

      if (exists) return exists;

      await redis().SetRedis(redisKey, otpData, 60);
      return null;
    } catch (e) {
      console.log("Redis error:", e);
      return null;
    }
  };

  // ---------------- OTP VERIFY ----------------
  const verifyOtp = async (mobile, otp) => {
    let redisKey = `SELLER_MOB_${mobile}`;
    let otpData = await redis().GetKeyRedis(redisKey);

    if (!otpData) return false;

    return otpData.otp == otp;
  };

  // ---------------- APPROVAL ACTIONS ----------------
  const approveSeller = (sellerId) => {
    return updateSeller(sellerId, {
      status: "approved",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectedReason: "",
    });
  };

  const rejectSeller = (sellerId, reason) => {
    return updateSeller(sellerId, {
      status: "rejected",
      rejectedReason: reason,
      rejectedAt: new Date(),
      approvedAt: null,
    });
  };

  const fetchByMobile = (mobile) => {
    return new Promise(function (resolve, reject) {
      Seller.findOne({ mobile }).then(resolve).catch(reject);
    });
  };

  const createSeller = (data) => {
    return new Promise(function (resolve, reject) {
      Seller.create(data).then(resolve).catch(reject);
    });
  };

  const updateSeller = (id, data) => {
    return new Promise(function (resolve, reject) {
      Seller.findByIdAndUpdate(id, data, { new: true })
        .then(resolve)
        .catch(reject);
    });
  };

  const setOtpInRedis = async (mobile, otpData) => {
    let key = `SELLER_OTP_${mobile}`;
    let exist = await redis().GetKeyRedis(key);
    if (exist) return exist;

    await redis().SetRedis(key, otpData, 60);
    return null;
  };

  const getOtpFromRedis = async (txnId) => {
    const key = `SELLER|txnId:${txnId}`;
    const redisKeys = await redis().GetKeys(key);

    if (redisKeys && redisKeys.length > 0) {
      const redisResult = await redis().GetRedis(redisKeys);
      return JSON.parse(redisResult[0]);
    }

    return null;
  };

  const storeOtpTxn = async (otpData) => {
    const key = `SELLER|txnId:${otpData.txnId}`;
    await redis().SetRedis(key, otpData, 120);
  };

  return {
    addSeller,
    fetch,
    fetchByQuery,
    updateSeller,
    deleteSeller,
    getSellers,
    countSellers,
    setSellerOtpInRedis,
    verifyOtp,
    approveSeller,
    rejectSeller,
    fetchByMobile,
    createSeller,
    updateSeller,
    setOtpInRedis,
    getOtpFromRedis,
    storeOtpTxn,
  };
};
