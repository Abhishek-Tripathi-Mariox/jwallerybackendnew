const Admin = require("../models/Admin");

module.exports = () => {
  const fetchByEmail = async (email) => {
    return await Admin.findOne({ email, isDeleted: false });
  };

  const fetchById = async (id) => {
    return await Admin.findOne({ _id: id, isDeleted: false });
  };

  const fetchByQuery = async (query) => {
    return await Admin.findOne({ ...query, isDeleted: false });
  };

  const createAdmin = async (data) => {
    const admin = new Admin(data);
    return await admin.save();
  };

  const updateAdmin = async (id, data) => {
    return await Admin.findByIdAndUpdate(id, data, { new: true });
  };

  const updateLastLogin = async (id) => {
    return await Admin.findByIdAndUpdate(
      id,
      { lastLogin: new Date() },
      { new: true },
    );
  };

  const getAllAdmins = async (query = {}, skip = 0, limit = 10) => {
    const admins = await Admin.find({ ...query, isDeleted: false })
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Admin.countDocuments({ ...query, isDeleted: false });

    return { admins, total };
  };

  const deleteAdmin = async (id) => {
    return await Admin.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  };

  return {
    fetchByEmail,
    fetchById,
    fetchByQuery,
    createAdmin,
    updateAdmin,
    updateLastLogin,
    getAllAdmins,
    deleteAdmin,
  };
};
