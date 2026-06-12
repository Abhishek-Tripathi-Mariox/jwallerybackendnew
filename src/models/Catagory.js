const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const CategorySchema = new Schema(
  {
    categoryName: {
      type: String,
      required: [true, "categoryName is required!"],
    },
    image: {
      type: String,
      // required: [true, "image is required!"],
    },
    description: {
      type: String,
      default: "",
    },
    rank: { type: Number, required: [true, "rank is required!"] },
    showOnHomeScreen: {
      type: Boolean,
      default: true,
    },
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

var Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
