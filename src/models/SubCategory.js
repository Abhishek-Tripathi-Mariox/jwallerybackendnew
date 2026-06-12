const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// A subcategory belongs to one parent Category. Admin creates/edits these per
// category; products can optionally reference one via Product.subCategoryId.
const SubCategorySchema = new Schema(
  {
    subCategoryName: {
      type: String,
      required: [true, "subCategoryName is required!"],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "categoryId is required!"],
      index: true,
    },
    image: { type: String, default: "" },
    rank: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubCategory", SubCategorySchema);
