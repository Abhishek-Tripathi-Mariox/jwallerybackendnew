const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StoreSchema = new Schema(
  {
    name: { type: String, required: [true, "name required!"], trim: true },
    address: { type: String, required: [true, "address required!"], trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    workingHours: { type: String, default: "", trim: true },

    // Optional — powers a "Directions" deep link with exact coordinates
    // instead of a text-address map search.
    latitude: { type: Number },
    longitude: { type: Number },

    // Display order on the storefront list.
    rank: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Store", StoreSchema);
