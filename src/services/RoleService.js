const Role = require("../models/Role");

module.exports = () => {
  const getAll = async () => {
    return Role.find({ isDeleted: false })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
  };

  const getById = async (id) => {
    return Role.findOne({ _id: id, isDeleted: false });
  };

  const create = async (data) => {
    return Role.create(data);
  };

  const update = async (id, data) => {
    return Role.findByIdAndUpdate(id, data, { new: true });
  };

  const remove = async (id) => {
    return Role.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  };

  const toggleStatus = async (id) => {
    const role = await Role.findById(id);
    if (!role) return null;
    role.isActive = !role.isActive;
    await role.save();
    return role;
  };

  return { getAll, getById, create, update, remove, toggleStatus };
};
