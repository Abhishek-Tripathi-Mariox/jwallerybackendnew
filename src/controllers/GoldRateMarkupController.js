const GoldRateMarkupService = require("../services/GoldRateMarkupService");
const GoldPriceService = require("../services/GoldPriceService");

module.exports = () => {
  const getMarkups = async (req, res, next) => {
    console.log("GoldRateMarkupController => getMarkups");
    const markups = await GoldRateMarkupService().getAll();

    let liveByKarat = {};
    try {
      const livePrices = await GoldPriceService().getFormattedPrices();
      liveByKarat = Object.fromEntries(
        livePrices.map((p) => [p.purity, p.liveRate]),
      );
    } catch (err) {
      console.error("getMarkups => failed to read live prices:", err.message);
    }

    const rows = markups.map((m) => {
      const liveRate = liveByKarat[m.karat] ?? null;
      const finalRate =
        liveRate != null
          ? Math.round(liveRate * (1 + (m.percent || 0) / 100) + (m.flat || 0))
          : null;
      return { ...m, liveRate, finalRate };
    });
    req.rData = rows;
    req.msg = "success";
    next();
  };

  const upsertMarkup = async (req, res, next) => {
    console.log("GoldRateMarkupController => upsertMarkup");
    const { karat } = req.params;
    const { flat, percent } = req.body;
    const adminId = req.admin.id;

    if (flat != null && (isNaN(Number(flat)) || Number(flat) < 0)) {
      req.statusCode = 400;
      throw new Error("Flat markup must be a non-negative number");
    }
    if (percent != null && (isNaN(Number(percent)) || Number(percent) < 0)) {
      req.statusCode = 400;
      throw new Error("Percent markup must be a non-negative number");
    }

    const updated = await GoldRateMarkupService().upsert(
      karat,
      flat,
      percent,
      adminId,
    );
    req.rData = updated;
    req.msg = "success";
    next();
  };

  return { getMarkups, upsertMarkup };
};
