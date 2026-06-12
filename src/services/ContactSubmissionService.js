const ContactSubmission = require("../models/ContactSubmission");

module.exports = () => {
  const create = async (payload) => {
    return ContactSubmission.create(payload);
  };

  const list = async ({ page = 1, limit = 20, status } = {}) => {
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ContactSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ContactSubmission.countDocuments(query),
    ]);
    return { items, page: Number(page), limit: Number(limit), total };
  };

  const setStatus = async (id, status, adminNotes) => {
    const update = { status };
    if (typeof adminNotes === "string") update.adminNotes = adminNotes;
    return ContactSubmission.findByIdAndUpdate(id, update, { new: true });
  };

  const remove = async (id) => ContactSubmission.findByIdAndDelete(id);

  return { create, list, setStatus, remove };
};
