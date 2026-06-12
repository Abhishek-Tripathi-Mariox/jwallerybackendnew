const redis = require("../util/redis");
const GoldRateMarkupService = require("./GoldRateMarkupService");

// Gold Price API Configuration
// You can use any of these APIs:
// 1. GoldAPI.io - https://www.goldapi.io (300 free requests/month)
// 2. MetalPriceAPI - https://metalpriceapi.com (100 free requests/month)
// 3. Metals.live - https://metals.live (Free)

const GOLD_API_KEY = process.env.GOLD_API_KEY || "";
const CACHE_KEY = "GOLD_PRICE_CACHE";
const CACHE_EXPIRY = 300; // 5 minutes

module.exports = () => {
  /**
   * Fetch live gold price from API
   * Using metals.live API (free, no API key required)
   */
  const fetchFromAPI = async () => {
    try {
      // Using metals.live API (free, no API key required)
      // Use https module directly to handle SSL issues
      const https = require("node:https");
      const data = await new Promise((resolve, reject) => {
        https.get(
          "https://api.metals.live/v1/spot/gold",
          { rejectUnauthorized: false },
          (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
              if (res.statusCode !== 200) {
                return reject(new Error("Failed to fetch gold price"));
              }
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          }
        ).on("error", reject);
      });

      // metals.live returns price in USD per troy ounce
      // Convert to INR per gram
      const usdPerOunce = data[0]?.price || 2650; // fallback price
      const usdToInr = 83.5; // You can fetch live rate too
      const gramsPerOunce = 31.1035;

      const pricePerGram24K = (usdPerOunce * usdToInr) / gramsPerOunce;
      const pricePerGram22K = pricePerGram24K * 0.9167; // 22K is 91.67% pure
      const pricePerGram18K = pricePerGram24K * 0.75; // 18K is 75% pure

      return {
        "24K": Math.round(pricePerGram24K),
        "22K": Math.round(pricePerGram22K),
        "18K": Math.round(pricePerGram18K),
        usdPerOunce: usdPerOunce,
        usdToInr: usdToInr,
        lastUpdated: new Date().toISOString(),
        source: "metals.live",
      };
    } catch (error) {
      console.error("Error fetching gold price from API:", error);
      return null;
    }
  };

  /**
   * Alternative: Fetch from GoldAPI.io (requires API key)
   */
  const fetchFromGoldAPI = async () => {
    try {
      if (!GOLD_API_KEY) {
        console.log("GOLD_API_KEY not configured, using fallback");
        return null;
      }

      const response = await fetch("https://www.goldapi.io/api/XAU/INR", {
        headers: {
          "x-access-token": GOLD_API_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("GoldAPI request failed");
      }

      const data = await response.json();

      // GoldAPI returns price per troy ounce in INR
      const inrPerOunce = data.price;
      const gramsPerOunce = 31.1035;

      const pricePerGram24K = inrPerOunce / gramsPerOunce;
      const pricePerGram22K = pricePerGram24K * 0.9167;
      const pricePerGram18K = pricePerGram24K * 0.75;

      return {
        "24K": Math.round(pricePerGram24K),
        "22K": Math.round(pricePerGram22K),
        "18K": Math.round(pricePerGram18K),
        inrPerOunce: inrPerOunce,
        lastUpdated: new Date().toISOString(),
        source: "goldapi.io",
      };
    } catch (error) {
      console.error("Error fetching from GoldAPI:", error);
      return null;
    }
  };

  /**
   * Get gold price with caching
   */
  const getGoldPrice = async () => {
    try {
      // Try to get from Redis cache first
      const cachedData = await redis().GetRedis([CACHE_KEY]);

      if (cachedData && cachedData[0]) {
        console.log("Returning cached gold price");
        return JSON.parse(cachedData[0]);
      }

      // Fetch fresh data from API
      let priceData = await fetchFromAPI();

      // Fallback to GoldAPI if metals.live fails
      if (!priceData) {
        priceData = await fetchFromGoldAPI();
      }

      // Fallback to static data if all APIs fail
      if (!priceData) {
        priceData = {
          "24K": 7890,
          "22K": 7231,
          "18K": 5918,
          lastUpdated: new Date().toISOString(),
          source: "fallback",
        };
      }

      // Cache the result
      await redis().SetRedis(CACHE_KEY, priceData, CACHE_EXPIRY);

      return priceData;
    } catch (error) {
      console.error("Error in getGoldPrice:", error);

      // Return fallback prices
      return {
        "24K": 7890,
        "22K": 7231,
        "18K": 5918,
        lastUpdated: new Date().toISOString(),
        source: "fallback",
      };
    }
  };

  /**
   * Get formatted gold prices for home screen
   */
  const applyMarkup = (liveRate, m) => {
    if (!m) return liveRate;
    const withPct = liveRate * (1 + (m.percent || 0) / 100);
    return Math.round(withPct + (m.flat || 0));
  };

  const getFormattedPrices = async () => {
    const prices = await getGoldPrice();
    const markup = await GoldRateMarkupService().getMap();

    const buildEntry = (purity) => {
      const live = prices[purity];
      if (live == null) return null;
      const m = markup[purity];
      const finalRate = applyMarkup(live, m);
      return {
        purity,
        rate: finalRate,
        liveRate: live,
        markup: m ? { flat: m.flat || 0, percent: m.percent || 0 } : { flat: 0, percent: 0 },
        unit: "per gram",
        lastUpdated: prices.lastUpdated,
      };
    };

    return ["24K", "22K", "18K"].map(buildEntry).filter(Boolean);
  };

  return {
    getGoldPrice,
    getFormattedPrices,
    fetchFromAPI,
    fetchFromGoldAPI,
  };
};
