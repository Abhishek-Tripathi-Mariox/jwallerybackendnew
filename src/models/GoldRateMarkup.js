const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GoldRateMarkupSchema = new Schema(
  {
    karat: {
      type: String,
      enum: ["24K", "22K", "18K", "SILVER"],
      required: [true, "Karat is required!"],
      unique: true,
    },
    flat: {
      type: Number,
      default: 0,
    },
    percent: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GoldRateMarkup", GoldRateMarkupSchema);
