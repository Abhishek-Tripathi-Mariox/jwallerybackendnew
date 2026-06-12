const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LogoSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["primary", "secondary", "favicon", "mobile_splash", "email_header"],
      required: [true, "Logo type is required!"],
      unique: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required!"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

const Logo = mongoose.model("Logo", LogoSchema);

module.exports = Logo;
