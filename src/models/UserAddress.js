const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const UserAddressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    fullName: { type: String, required: [true, "fullName required!"] },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
      required: "address require!",
    },
    houseNo: {
      type: String,
    },
    apartment: {
      type: String,
    },
    city: {
      type: String,
      required: "city require!",
    },
    state: {
      type: String,
      required: "state require!",
    },
    country: {
      type: String,
    },
    pinCode: {
      type: Number,
      required: "pinCode require!",
    },
    // Optional — set when the address was picked via the map (pin-drop),
    // absent for addresses typed in manually.
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    addressType: {
      type: String,
      required: true,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

var UserAddress = mongoose.model("UserAddress", UserAddressSchema);

module.exports = UserAddress;
