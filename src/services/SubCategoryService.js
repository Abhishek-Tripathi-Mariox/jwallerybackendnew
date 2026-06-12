const SubCategory = require("../models/SubCategory");

module.exports = () => {
  /** Active subcategories for the website, optionally filtered by category. */
  const getActive = (categoryId) => {
    const q = { isActive: true, isDeleted: { $ne: true } };
    if (categoryId) q.categoryId = categoryId;
    return SubCategory.find(q).sort({ rank: 1 }).select("-__v").lean();
  };

  const getById = (id) => SubCategory.findById(id);

  const create = (data) => SubCategory.create(data);

  const update = (id, data) =>
    SubCategory.findByIdAndUpdate(id, data, { new: true });

  const remove = (id) =>
    SubCategory.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

  /** Paginated admin list, optionally filtered by parent category. */
  const getAll = (page = 1, limit = 50, categoryId) => {
    const skip = (page - 1) * limit;
    const q = { isDeleted: { $ne: true } };
    if (categoryId) q.categoryId = categoryId;
    return Promise.all([
      SubCategory.find(q)
        .sort({ rank: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("categoryId", "categoryName")
        .lean(),
      SubCategory.countDocuments(q),
    ]);
  };

  return { getActive, getById, create, update, remove, getAll };
};
