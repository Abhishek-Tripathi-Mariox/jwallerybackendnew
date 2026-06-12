const jwt = require("jsonwebtoken");
const ResponseMiddleware = require("./ResponseMiddleware");
const JWTSECRET = process.env.JWTSECRET;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const UserService = require("../services/UserService");
const SellerService = require("../services/SellerService");
const AdminService = require("../services/AdminService");

module.exports = () => {
  const verifyUserToken = async (req, res, next) => {
    console.log("AuthMiddleware => verifyUserToken");
    let usertoken = req.headers.authorization;

    try {
      if (usertoken) {
        let tokens = usertoken.split(" ");

        let token = tokens[1];
        // console.log("Token", token)
        let payload = jwt.verify(token, JWTSECRET);

        let user = await UserService().fetchByQuery({
          _id: payload.userId,
          // token,
        });

        if (user && !user.isActive) {
          throw new Error("ac_deactivated");
        }

        //checking user must exist in our DB else throwing error
        if (user) {
          console.log(`User with ID ${user._id} entered.`);
          // req.body.userId = user._id;
          req.body = { ...(req.body || {}), userId: user._id };
          next();
        } else {
          throw new Error("invalid_token");
        }
      } else {
        throw new Error("invalid_token");
      }
    } catch (ex) {
      // console.log("heres",ex)
      req.rCode = 3;
      req.msg = "invalid_token";
      if (ex.message == "ac_deactivated") req.msg = ex.message;

      ResponseMiddleware(req, res, next);
    }
  };

  const verifySellerToken = async (req, res, next) => {
    console.log("SellerAuthMiddleware => verifySellerToken");

    let tokenHeader = req.headers.authorization;

    try {
      if (!tokenHeader) throw new Error("invalid_token");

      const parts = tokenHeader.split(" ");
      const token = parts[1];

      const payload = jwt.verify(token, JWTSECRET);

      let seller = await SellerService().fetch(payload.sellerId);

      if (!seller) throw new Error("invalid_token");

      if (!seller.isActive) throw new Error("ac_deactivated");

      req.body = { ...(req.body || {}), sellerId: seller._id };

      next();
    } catch (err) {
      req.rCode = 3;
      req.msg =
        err.message === "ac_deactivated" ? "ac_deactivated" : "invalid_token";
      ResponseMiddleware(req, res, next);
    }
  };

  const verifyAdminToken = async (req, res, next) => {
    console.log("AuthMiddleware => verifyAdminToken");

    let tokenHeader = req.headers.authorization;

    try {
      if (!tokenHeader) throw new Error("invalid_token");

      const parts = tokenHeader.split(" ");
      const token = parts[1];

      const payload = jwt.verify(token, JWT_SECRET);

      let admin = await AdminService().fetchById(payload.id);

      if (!admin) throw new Error("invalid_token");

      if (!admin.isActive) throw new Error("ac_deactivated");

      req.admin = { id: admin._id, email: admin.email, role: admin.role };

      next();
    } catch (err) {
      req.rCode = 3;
      req.msg =
        err.message === "ac_deactivated" ? "ac_deactivated" : "invalid_token";
      ResponseMiddleware(req, res, next);
    }
  };

  /**
   * Like verifyUserToken but never rejects: if a valid user token is present
   * it sets req.body.userId (so wishlist flags etc. work), otherwise it lets
   * the request through as a guest. Use for public browse endpoints.
   */
  const optionalUserToken = async (req, res, next) => {
    const usertoken = req.headers.authorization;
    req.body = req.body || {};
    try {
      if (usertoken) {
        const token = usertoken.split(" ")[1];
        const payload = jwt.verify(token, JWTSECRET);
        const user = await UserService().fetchByQuery({ _id: payload.userId });
        if (user && user.isActive) {
          req.body = { ...(req.body || {}), userId: user._id };
        }
      }
    } catch (ex) {
      // Ignore invalid/expired tokens — continue as a guest.
    }
    next();
  };

  return {
    verifyUserToken,
    optionalUserToken,
    verifySellerToken,
    verifyAdminToken,
  };
};
