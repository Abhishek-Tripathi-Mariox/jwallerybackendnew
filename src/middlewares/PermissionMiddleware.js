const Admin = require("../models/Admin");

/**
 * Check if the logged-in admin has permission for a specific module and action.
 * Superadmins bypass all permission checks.
 *
 * Usage: checkPermission("orders", "read")
 */
const checkPermission = (module, action = "read") => {
  return async (req, res, next) => {
    try {
      // Superadmins have full access
      if (req.admin.role === "superadmin") {
        return next();
      }

      const admin = await Admin.findById(req.admin.id).populate("roleId");

      if (!admin || !admin.roleId) {
        return res.status(403).send({
          code: 4,
          message: "No role assigned. Contact your administrator.",
          data: {},
        });
      }

      if (!admin.roleId.isActive) {
        return res.status(403).send({
          code: 4,
          message: "Your role has been deactivated.",
          data: {},
        });
      }

      const permission = admin.roleId.permissions.find(
        (p) => p.module === module,
      );

      if (!permission || !permission[action]) {
        return res.status(403).send({
          code: 4,
          message: `You don't have ${action} permission for ${module}.`,
          data: {},
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).send({
        code: 0,
        message: "Permission check failed",
        data: {},
      });
    }
  };
};

module.exports = { checkPermission };
