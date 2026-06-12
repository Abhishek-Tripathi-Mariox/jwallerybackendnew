const Reels = require("../models/Reels");

module.exports = () => {
  /** Active reels for the website, ordered by rank. */
  const getActiveReels = (limit = 50) =>
    Reels.find({ isActive: true })
      .sort({ rank: 1 })
      .limit(limit)
      .select("-__v");

  const getReelById = (id) => Reels.findById(id);

  const createReel = (data) => Reels.create(data);

  const updateReel = (id, data) =>
    Reels.findByIdAndUpdate(id, data, { new: true });

  const deleteReel = (id) => Reels.findByIdAndDelete(id);

  /** Paginated list for the admin table. */
  const getAllReels = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return Promise.all([
      Reels.find().sort({ rank: 1 }).skip(skip).limit(Number(limit)).lean(),
      Reels.countDocuments(),
    ]);
  };

  return {
    getActiveReels,
    getReelById,
    createReel,
    updateReel,
    deleteReel,
    getAllReels,
  };
};
