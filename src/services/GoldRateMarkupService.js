const GoldRateMarkup = require("../models/GoldRateMarkup");

const KARATS = ["24K", "22K", "18K", "SILVER"];

module.exports = () => {
  const getAll = async () => {
    const docs = await GoldRateMarkup.find().lean();
    const byKarat = Object.fromEntries(docs.map((d) => [d.karat, d]));
    return KARATS.map((k) => ({
      karat: k,
      flat: byKarat[k]?.flat ?? 0,
      percent: byKarat[k]?.percent ?? 0,
      updatedAt: byKarat[k]?.updatedAt ?? null,
    }));
  };

  const getMap = async () => {
    const docs = await GoldRateMarkup.find().lean();
    const map = {};
    for (const d of docs) {
      map[d.karat] = { flat: d.flat || 0, percent: d.percent || 0 };
    }
    return map;
  };

  const upsert = async (karat, flat, percent, adminId) => {
    if (!KARATS.includes(karat)) {
      throw new Error("Invalid karat");
    }
    return GoldRateMarkup.findOneAndUpdate(
      { karat },
      {
        karat,
        flat: Number(flat) || 0,
        percent: Number(percent) || 0,
        updatedBy: adminId,
      },
      { upsert: true, new: true },
    );
  };

  return { getAll, getMap, upsert, KARATS };
};
