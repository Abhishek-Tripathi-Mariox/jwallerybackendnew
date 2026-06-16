const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    profileImages: {
      type: String,
      default: "",
      trim: true,
    },
    gender: {
      type: String,
      defailt: "Male",
      enum: ["Male", "Female", "Other"],
      required: false,
    },
    dob: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "India",
    },
    countryCode: {
      type: String,
      required: [true, "Country code is required!"],
      default: "+91",
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required!"],
      unique: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number!"],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    notificationAllowed: {
      type: Boolean,
      default: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [long, lat]
    },
  },
  { timestamps: true }
);

UserSchema.index({ location: "2dsphere" });

const User = mongoose.model("User", UserSchema);
module.exports = User;
