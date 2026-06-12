const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProductsSchema = new Schema(
  {
    // ---------------- BASIC DETAILS ----------------
    productName: { type: String, required: true, index: true },
    brand: { type: String, default: "" },

    // Shop reference (Trendy Apparel etc.)
    shopId: { type: Schema.Types.ObjectId, ref: "Seller" },

    // Category (shirts, jeans, skirts, shorts…)
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },

    // Optional subcategory within the parent category.
    subCategoryId: { type: Schema.Types.ObjectId, ref: "SubCategory" },

    // Material / metal — drives the website Material filter and the product
    // page's "Material" line (e.g. "22K Gold", "18K Gold", "Pearl", "Stone").
    material: { type: String, default: "" },

    // ---------------- IMAGES ----------------
    productImages: [
      {
        url: String,
      },
    ],

    // ---------------- VARIANTS ----------------
    colors: [
      {
        name: String, // "Beige", "Black"
        code: String, // "#F2D3C3"
      },
    ],

    sizes: [
      {
        label: String, // "S" / "M" / "L"
        inStock: { type: Boolean, default: true },
      },
    ],

    // ---------------- PRICING ----------------
    price: { type: Number, required: true }, // main price (used as fallback when gold pricing is not set)
    discountPrice: { type: Number }, // price after discount
    discountPercent: { type: Number }, // 20%
    currency: { type: String, default: "₹" },

    // ---------------- GOLD-BASED PRICING (optional) ----------------
    // When `goldPricing.isEnabled` is true the API surfaces a `computedPrice`
    // derived from these fields and the live 24K rate. The shop UI prefers the
    // computed price over the static `price` field so quotes track the market.
    //
    // Formula: weightGrams * ((goldPurityPercent + makingChargePercent) / 100) * rate24K
    goldPricing: {
      isEnabled: { type: Boolean, default: false },
      weightGrams: { type: Number, default: 0 },        // e.g. 1.2
      goldPurityPercent: { type: Number, default: 0 },  // e.g. 25 means 25%
      makingChargePercent: { type: Number, default: 0 },// e.g. 10 means 10%
    },

    // ---------------- STOCK ----------------
    stock: { type: Number, default: 0 }, // total units

    // ---------------- RATING ----------------
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },

    // ---------------- DESCRIPTION ----------------
    description: { type: String, default: "" },

    descriptionImages: [
      {
        image: String,
      },
    ],

    highlights: [
      {
        text: String, // bullet points
      },
    ],

    features: { type: String, default: "" },

    // ---------------- FLAGS ----------------
    isFeatured: { type: Boolean, default: false },
    showOnDashboard: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // ---------------- SEO (optional but useful) ----------------
    slug: { type: String, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Products", ProductsSchema);
