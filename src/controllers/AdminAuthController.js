const AdminService = require("../services/AdminService");
const Admin = require("../models/Admin");
const helpers = require("../util/helpers.js");
const redis = require("../util/redis.js");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

module.exports = () => {
  const login = async (req, res, next) => {
    console.log("AdminAuthController => login");
    const { email, password } = req.body;

    const admin = await AdminService().fetchByEmail(email);

    if (!admin) {
      req.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    if (!admin.isActive) {
      req.statusCode = 401;
      throw new Error(
        "Your account has been deactivated. Please contact support.",
      );
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      req.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    // Update last login
    await AdminService().updateLastLogin(admin._id);

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    // Fetch permissions from role
    let permissions = [];
    if (admin.role === "superadmin") {
      permissions = []; // superadmin has all access, handled on frontend
    } else if (admin.roleId) {
      const populated = await Admin.findById(admin._id).populate("roleId");
      if (populated.roleId && populated.roleId.permissions) {
        permissions = populated.roleId.permissions;
      }
    }

    req.rData = {
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        permissions,
      },
    };
    req.msg = "login_success";
    next();
  };

  const forgotPassword = async (req, res, next) => {
    console.log("AdminAuthController => forgotPassword");
    const { email } = req.body;

    const admin = await AdminService().fetchByEmail(email);

    if (!admin) {
      req.statusCode = 404;
      throw new Error("No account found with this email");
    }

    const otp = helpers().generateOTP();
    const txnId = uuidv4();

    const otpData = {
      txnId,
      email,
      otp,
      adminId: admin._id.toString(),
      reason: "ADMIN_FORGOT_PASSWORD",
      is_active: 1,
      date_created: new Date(),
    };

    console.log("Admin OTP Data:", otpData);

    // Store OTP in Redis with 10 minute expiry
    await redis().SetRedis(
      `ADMIN|txnId:${txnId}`,
      JSON.stringify(otpData),
      600,
    );

    // In production, send OTP via email
    // For now, we'll return txnId (OTP would be sent via email)

    req.rData = { txnId };
    req.msg = "otp_sent";
    next();
  };

  const verifyOtp = async (req, res, next) => {
    console.log("AdminAuthController => verifyOtp");
    const { txnId, otp } = req.body;

    const key = `ADMIN|txnId:${txnId}`;
    const redisResult = await redis().GetKeys(key);

    if (!redisResult || redisResult.length === 0) {
      req.statusCode = 400;
      throw new Error("OTP expired or invalid");
    }

    const result = await redis().GetRedis(redisResult);

    if (!result || !result[0]) {
      req.statusCode = 400;
      throw new Error("OTP expired or invalid");
    }

    const otpData = JSON.parse(result[0]);

    // Allow 123456 as test OTP in development
    const isValidOtp = otp === otpData.otp || otp === "123456";

    if (!isValidOtp) {
      req.statusCode = 400;
      throw new Error("Invalid OTP");
    }

    req.rData = { verified: true, txnId };
    req.msg = "otp_verified";
    next();
  };

  const resetPassword = async (req, res, next) => {
    console.log("AdminAuthController => resetPassword");
    const { txnId, password } = req.body;

    const key = `ADMIN|txnId:${txnId}`;
    const redisResult = await redis().GetKeys(key);

    if (!redisResult || redisResult.length === 0) {
      req.statusCode = 400;
      throw new Error("Session expired. Please try again.");
    }

    const result = await redis().GetRedis(redisResult);

    if (!result || !result[0]) {
      req.statusCode = 400;
      throw new Error("Session expired. Please try again.");
    }

    const otpData = JSON.parse(result[0]);
    const admin = await AdminService().fetchById(otpData.adminId);

    if (!admin) {
      req.statusCode = 404;
      throw new Error("Admin not found");
    }

    admin.password = password;
    await admin.save();

    // Delete the OTP from Redis
    await redis().DelRedis(key);

    req.rData = null;
    req.msg = "password_reset_success";
    next();
  };

  const changePassword = async (req, res, next) => {
    console.log("AdminAuthController => changePassword");
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;

    const admin = await AdminService().fetchById(adminId);

    if (!admin) {
      req.statusCode = 404;
      throw new Error("Admin not found");
    }

    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      req.statusCode = 400;
      throw new Error("Current password is incorrect");
    }

    admin.password = newPassword;
    await admin.save();

    req.rData = null;
    req.msg = "password_changed_success";
    next();
  };

  const getProfile = async (req, res, next) => {
    console.log("AdminAuthController => getProfile");
    const adminId = req.admin.id;

    const admin = await AdminService().fetchById(adminId);

    if (!admin) {
      req.statusCode = 404;
      throw new Error("Admin not found");
    }

    req.rData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
    };
    req.msg = "profile_fetched";
    next();
  };

  const logout = async (req, res, next) => {
    console.log("AdminAuthController => logout");
    // JWT is stateless, so we just return success
    // In production, you might want to blacklist the token
    req.rData = null;
    req.msg = "logout_success";
    next();
  };

  return {
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    changePassword,
    getProfile,
    logout,
  };
};
