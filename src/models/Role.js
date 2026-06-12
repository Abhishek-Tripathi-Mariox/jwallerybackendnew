const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Each permission maps to a sidebar module with CRUD flags.
 */
const PermissionSchema = new Schema(
  {
    module: {
      type: String,
      required: true,
      // Matches sidebar paths
      enum: [
        "dashboard",
        "orders",
        "payments",
        "users",
        "banners",
        "coupons",
        "home-screen",
        "categories",
        "products",
        "system-sms",
        "system-email",
        "system-payment",
        "system-google-maps",
        "system-firebase",
        "system-support",
        "settings",
        "logos",
        "roles",
        "staff",
      ],
    },
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false },
);

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required!"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    permissions: [PermissionSchema],
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

const Role = mongoose.model("Role", RoleSchema);

module.exports = Role;
