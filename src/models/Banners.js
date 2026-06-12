const mongoose = require("mongoose");
var Schema = mongoose.Schema;
// Banners can be placed in any of several named "slots" on the home page.
// One Banners collection drives them all — the website filters by `section`.
const BANNER_SECTIONS = [
  "home_offers",      // existing two-card row (gold/diamond)
  "home_hero",        // big hero block at top
  "home_sundar_keel", // big premium card
  "home_bridal",      // smaller bridal feature
  "home_temple",      // smaller temple feature
  "home_cta",         // bottom dark CTA banner
  "match_tiles",      // "Find Your Perfect Match" tiles (multiple)
];

const BannersSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "title require!"],
    },
    subtitle: { type: String, default: "" },
    section: {
      type: String,
      enum: BANNER_SECTIONS,
      default: "home_offers",
      index: true,
    },
    link: { type: String, default: "" }, // optional CTA target URL/path
    mobileView: {
      type: String,
      default: "",
    },
    ipadView: {
      type: String,
      default: "",
    },
    desktopView: {
      type: String,
      default: "",
    },
    rank: {
      type: Number,
      required: [true, "rank require!"],
    },
    startDate: { type: Date },
    expireDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

var Banners = mongoose.model("Banners", BannersSchema);
Banners.SECTIONS = BANNER_SECTIONS;

module.exports = Banners;
