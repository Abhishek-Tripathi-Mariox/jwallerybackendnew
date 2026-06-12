const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const BrandsSchema = new Schema(
  {
    brand: { type: String, required: [true, "brand require!"] },
    image: { type: String, required: [true, "description require!"] },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

var Brands = mongoose.model("Brands", BrandsSchema);

module.exports = Brands;
