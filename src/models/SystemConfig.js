const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SystemConfigSchema = new Schema(
  {
    configType: {
      type: String,
      enum: ["sms", "email", "payment", "google_maps", "firebase", "support"],
      required: [true, "Config type is required!"],
      unique: true,
    },
    provider: {
      type: String,
      required: [true, "Provider is required!"],
      trim: true,
    },
    credentials: {
      type: Map,
      of: String,
      required: [true, "Credentials are required!"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

const SystemConfig = mongoose.model("SystemConfig", SystemConfigSchema);

module.exports = SystemConfig;
