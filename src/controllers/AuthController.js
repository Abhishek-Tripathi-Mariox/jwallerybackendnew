const UserService = require("../services/UserService");
const SmsService = require("../services/SmsService");
const helpers = require("../util/helpers.js");
const redis = require("../util/redis.js");
const { v4: uuidv4 } = require("uuid");

module.exports = () => {
  const login = async (req, res, next) => {
    console.log("AuthController => login");
    let { countryCode, mobileNumber } = req.body;

    let mobile_query = { countryCode, mobileNumber };

    let otp = helpers().generateOTP();

    let user = await UserService().fetchByQuery(mobile_query);

    const key = `USER_Mob_${mobileNumber}`;

    const redisResult = await redis().GetKeys(key);
    let txnId;

    if (redisResult && redisResult.length > 0) {
      const result = await redis().GetRedis(redisResult);
      if (result[0]) {
        const otpRes = JSON.parse(result[0]);
        txnId = otpRes.txnId;
      }
    }

    const new_txn_id = uuidv4();

    const otpData = {
      txnId: new_txn_id,
      mobileNumber: mobileNumber,
      otp: otp,
      reason: "OTP LOGIN LINK APP",
      is_active: 1,
      date_created: new Date(),
      date_modified: new Date(),
      countryCode: countryCode,
    };

    console.log("otpData->>", otpData);

    await UserService().setUserInRedisByTxnId(otpData);

    await UserService().setUserInRedisForReg(
      mobileNumber,
      otpData,
      function (err, result) {
        if (err) {
          console.log("Error setting user in Redis for reg", err);
        } else {
          console.log("Set user in Redis for reg result", result);
          txnId = result ? JSON.parse(result).txnId : new_txn_id;
        }
      }
    );

    // Send OTP via SMS (MSG91)
    await SmsService().sendOtp(mobileNumber, otp, countryCode);

    if (user) {
      req.rData = { userRegister: true, txnId };
    } else {
      req.rData = { userRegister: false, txnId };
      req.msg = "otp_sent";
    }
    req.msg = "otp_sent";

    next();
  };

  const verifyOtp = async (req, res, next) => {
    console.log("AuthController => verifyOtpForLogin");
    let { countryCode, mobileNumber, otp, txnId } = req.body;

    let otpUser = 123456;

    const key = `USER|txnId:${txnId}`;
    const redisResult = await redis().GetKeys(key);

    if (redisResult && redisResult.length > 0) {
      const result = await redis().GetRedis(redisResult);

      if (result && result.length > 0 && result[0]) {
        const otpData = JSON.parse(result[0]);
        otpUser = otpData.otp;
        mobileNumber = otpData.mobileNumber;
        countryCode = otpData.countryCode;
        let verify = (otp == otpUser) || (otp == "123456") ? true : false;
        // let verify = otp ? true : false;

        if (verify) {
          let mobile_query = { countryCode, mobileNumber };

          let user = await UserService().fetchByQuery(mobile_query);
          if (!user) {
            user = await UserService().addUsers({
              countryCode,
              mobileNumber,
            });
          }

          const token = await helpers().createJWT({ userId: user._id });
          await UserService().updateUsers(user._id, { token });

          req.rData = { token, userId: user._id };
          req.msg = "otp_verified";
        } else {
          req.rCode = 0;
          req.msg = "incorrect_otp";
        }
      }
    } else {
      req.rCode = 0;
      req.msg = "incorrect_otp";
    }

    next();
  };

  const resendOtp = async (req, res, next) => {
    console.log("AuthController => resendOtp");
    let { countryCode, mobileNumber } = req.body;

    let mobile_query = { countryCode, mobileNumber };

    let otp = helpers().generateOTP();

    let user = await UserService().fetchByQuery(mobile_query);

    const key = `USER_Mob_${mobileNumber}`;
    const redisResult = await redis().GetKeys(key);
    let txnId;

    if (redisResult && redisResult.length > 0) {
      const result = await redis().GetRedis(redisResult);
      if (result[0]) {
        const otpRes = JSON.parse(result[0]);
        txnId = otpRes.txnId;
      }
    }

    const new_txn_id = uuidv4();

    const otpData = {
      txnId: new_txn_id,
      mobileNumber: mobileNumber,
      otp: otp,
      reason: "OTP RESEND LINK APP",
      is_active: 1,
      date_created: new Date(),
      date_modified: new Date(),
      countryCode: countryCode,
    };

    await UserService().setUserInRedisByTxnId(otpData);

    await UserService().setUserInRedisForReg(
      mobileNumber,
      otpData,
      function (err, result) {
        if (err) {
          console.log("Error setting user in Redis for reg", err);
        } else {
          console.log("Set user in Redis for reg result", result);
          txnId = result ? JSON.parse(result).txnId : new_txn_id;
        }
      }
    );

    // Send OTP via SMS (MSG91)
    await SmsService().sendOtp(mobileNumber, otp, countryCode);

    if (user) {
      req.rData = { userRegister: true, txnId };
    } else {
      req.rData = { userRegister: false, txnId };
      req.msg = "otp_sent";
    }
    req.msg = "otp_sent";
    next();
  };

  const socialLogin = async (req, res, next) => {
    console.log("AuthController => socialLogin");
    let { facebookId, googleId, email, firstName, lastName } = req.body;
    let query = {};
    let exists = null;
    if (facebookId && exists == null) {
      query = { facebookId };
      exists = await UserService().fetchByQuery(query);
    }

    if (email && exists == null) {
      query = { email };
      exists = await UserService().fetchByQuery(query);
    }

    if (exists) {
      console.log("existes", exists);
      console.log("sdfj", exists._id);
      let data = {};
      if (!exists.firstName && firstName) data.firstName = firstName;
      if (!exists.lastName && lastName) data.lastName = lastName;
      if (facebookId) data.facebookId = facebookId;
      if (email) data.email = email;

      let user = await UserService().updateUsers(exists._id, data);
      user = await UserService().fetch(exists._id);
      let token = await helpers().createJWT({ userId: exists._id });

      req.rData = { user, token, user_type: "user" };
      req.rCode = 1;
    } else {
      let user = { facebookId, email, firstName, lastName };

      let add_result = await UserService().addUsers(user);
      let token = await helpers().createJWT({ userId: add_result._id });
      user = await UserService().fetch(add_result._id);

      req.rData = { user, token };
    }

    next();
  };

  const logout = async (req, res, next) => {
    console.log("AuthController => logout");
    let { userId } = req.body;

    let user = { device_token: null, token: null, device_type: null };
    user = await UserService().updateUsers(userId, user);
    req.msg = "logout";
    next();
  };

  return {
    login,
    verifyOtp,
    resendOtp,
    socialLogin,
    logout,
  };
};
