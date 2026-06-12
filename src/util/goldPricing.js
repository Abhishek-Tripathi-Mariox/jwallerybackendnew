/**
 * Shared gold-price math used across product list/detail responses.
 *
 *   weightGrams * ((purityPercent + makingChargePercent) / 100) * rate24K
 *
 * The customer-paid price is the rounded result. Returns a structured object
 * so the UI can render the breakdown without re-deriving anything.
 */
const computeGoldPrice = ({
  weightGrams = 0,
  goldPurityPercent = 0,
  makingChargePercent = 0,
  rate24K = 0,
} = {}) => {
  const w = Number(weightGrams) || 0;
  const purity = Number(goldPurityPercent) || 0;
  const making = Number(makingChargePercent) || 0;
  const rate = Number(rate24K) || 0;
  const combinedPct = purity + making;
  const goldEquivalentGrams = w * (combinedPct / 100);
  const price = goldEquivalentGrams * rate;
  return {
    weightGrams: w,
    goldPurityPercent: purity,
    makingChargePercent: making,
    combinedPercent: combinedPct,
    goldEquivalentGrams: Number(goldEquivalentGrams.toFixed(4)),
    rate24K: rate,
    price: Math.round(price),
  };
};

/**
 * Attach a `computedPrice` and `goldBreakdown` to a product (or array of
 * products) when `goldPricing.isEnabled` is true. Mutates and returns the
 * input for convenience; safe for `.lean()` documents.
 *
 * Pass `rate24K` from the caller (GoldPriceService) to avoid hammering Redis
 * once per item.
 */
const decorateWithGoldPricing = (productOrList, rate24K) => {
  const decorate = (p) => {
    if (!p || !p.goldPricing || !p.goldPricing.isEnabled) return p;
    const breakdown = computeGoldPrice({
      weightGrams: p.goldPricing.weightGrams,
      goldPurityPercent: p.goldPricing.goldPurityPercent,
      makingChargePercent: p.goldPricing.makingChargePercent,
      rate24K,
    });
    p.computedPrice = breakdown.price;
    p.goldBreakdown = breakdown;
    return p;
  };

  if (Array.isArray(productOrList)) {
    return productOrList.map(decorate);
  }
  return decorate(productOrList);
};

/**
 * Higher-level convenience: fetch the live (admin-marked-up) 24K rate from
 * GoldPriceService, then decorate. Safe to call on an empty list / null.
 *
 * If the gold rate lookup throws (network / cache miss), products fall back
 * to their static `price` field — never blocks rendering.
 */
const decorateWithLiveRate = async (productOrList) => {
  if (!productOrList) return productOrList;
  try {
    // Lazy-require to avoid a circular dep with services importing this util.
    const GoldPriceService = require("../services/GoldPriceService");
    const prices = await GoldPriceService().getFormattedPrices();
    const r24 = prices.find((p) => p.purity === "24K");
    const rate24K = r24 ? Number(r24.rate) : 0;
    return decorateWithGoldPricing(productOrList, rate24K);
  } catch (err) {
    console.error("decorateWithLiveRate failed:", err.message);
    return productOrList;
  }
};

module.exports = {
  computeGoldPrice,
  decorateWithGoldPricing,
  decorateWithLiveRate,
};
