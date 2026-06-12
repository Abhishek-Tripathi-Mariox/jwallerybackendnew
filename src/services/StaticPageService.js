const StaticPage = require("../models/StaticPage");

module.exports = () => {
  const list = async ({ includeDrafts = false } = {}) => {
    const query = includeDrafts ? {} : { isPublished: true };
    return StaticPage.find(query).sort({ slug: 1 }).lean();
  };

  const getBySlug = async (slug, { includeDrafts = false } = {}) => {
    const query = { slug: String(slug || "").toLowerCase() };
    if (!includeDrafts) query.isPublished = true;
    return StaticPage.findOne(query).lean();
  };

  const upsert = async (slug, patch, adminId) => {
    const normSlug = String(slug || "").toLowerCase().trim();
    const update = {
      ...patch,
      slug: normSlug,
      updatedBy: adminId,
    };
    return StaticPage.findOneAndUpdate({ slug: normSlug }, update, {
      new: true,
      upsert: true,
    });
  };

  const remove = async (id) => StaticPage.findByIdAndDelete(id);

  return { list, getBySlug, upsert, remove };
};
