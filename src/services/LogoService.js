const Logo = require("../models/Logo");

module.exports = () => {
  const getAll = async () => {
    return Logo.find().populate("uploadedBy", "name email").sort({ type: 1 });
  };

  const getPublic = async () => {
    return Logo.find({ isActive: true })
      .select("type imageUrl title updatedAt")
      .sort({ type: 1 });
  };

  const getByType = async (type) => {
    return Logo.findOne({ type });
  };

  const upsert = async (type, imageUrl, title, adminId) => {
    return Logo.findOneAndUpdate(
      { type },
      { type, imageUrl, title, uploadedBy: adminId, isActive: true },
      { upsert: true, new: true },
    );
  };

  const remove = async (id) => {
    return Logo.findByIdAndDelete(id);
  };

  return { getAll, getPublic, getByType, upsert, remove };
};
