const { Validator } = require("node-input-validator");

module.exports = () => {
  const validateLogin = async (req, res, next) => {
    const v = new Validator(req.body, {
      email: "required|email",
      password: "required|minLength:6",
    });

    const matched = await v.check();

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.errors,
      });
    }

    next();
  };

  const validateForgotPassword = async (req, res, next) => {
    const v = new Validator(req.body, {
      email: "required|email",
    });

    const matched = await v.check();

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.errors,
      });
    }

    next();
  };

  const validateVerifyOtp = async (req, res, next) => {
    const v = new Validator(req.body, {
      txnId: "required",
      otp: "required|minLength:6|maxLength:6",
    });

    const matched = await v.check();

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.errors,
      });
    }

    next();
  };

  const validateResetPassword = async (req, res, next) => {
    const v = new Validator(req.body, {
      txnId: "required",
      password: "required|minLength:6",
    });

    const matched = await v.check();

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.errors,
      });
    }

    next();
  };

  const validateChangePassword = async (req, res, next) => {
    const v = new Validator(req.body, {
      currentPassword: "required|minLength:6",
      newPassword: "required|minLength:6",
    });

    const matched = await v.check();

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.errors,
      });
    }

    next();
  };

  return {
    validateLogin,
    validateForgotPassword,
    validateVerifyOtp,
    validateResetPassword,
    validateChangePassword,
  };
};
