const AdminService = require("../services/AdminService");
const Admin = require("../models/Admin");

module.exports = () => {
  const getStaff = async (req, res, next) => {
    console.log("StaffController => getStaff");

    const staff = await Admin.find({ isDeleted: false })
      .populate("roleId", "name permissions isActive")
      .populate("createdBy", "name email")
      .select("-password")
      .sort({ createdAt: -1 });

    req.rData = staff;
    req.msg = "success";
    next();
  };

  const getStaffById = async (req, res, next) => {
    console.log("StaffController => getStaffById");
    const { id } = req.params;

    const staff = await Admin.findById(id)
      .populate("roleId", "name permissions isActive")
      .select("-password");

    if (!staff) {
      req.statusCode = 404;
      throw new Error("Staff member not found");
    }

    req.rData = staff;
    req.msg = "success";
    next();
  };

  const createStaff = async (req, res, next) => {
    console.log("StaffController => createStaff");
    const { name, email, password, phone, role, roleId } = req.body;
    const adminId = req.admin.id;

    if (!name || !email || !password) {
      req.statusCode = 400;
      throw new Error("Name, email, and password are required");
    }

    // Check email uniqueness
    const existing = await AdminService().fetchByEmail(email);
    if (existing) {
      req.statusCode = 400;
      throw new Error("Email already exists");
    }

    const staff = await Admin.create({
      name,
      email,
      password,
      phone: phone || "",
      role: role || "admin",
      roleId: roleId || null,
      createdBy: adminId,
    });

    const populated = await Admin.findById(staff._id)
      .populate("roleId", "name permissions isActive")
      .select("-password");

    req.rData = populated;
    req.msg = "staff_created";
    next();
  };

  const updateStaff = async (req, res, next) => {
    console.log("StaffController => updateStaff");
    const { id } = req.params;
    const { name, email, phone, role, roleId, isActive } = req.body;

    const staff = await Admin.findById(id);
    if (!staff) {
      req.statusCode = 404;
      throw new Error("Staff member not found");
    }

    if (name !== undefined) staff.name = name;
    if (email !== undefined) staff.email = email;
    if (phone !== undefined) staff.phone = phone;
    if (role !== undefined) staff.role = role;
    if (roleId !== undefined) staff.roleId = roleId;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    const populated = await Admin.findById(id)
      .populate("roleId", "name permissions isActive")
      .select("-password");

    req.rData = populated;
    req.msg = "staff_updated";
    next();
  };

  const deleteStaff = async (req, res, next) => {
    console.log("StaffController => deleteStaff");
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.admin.id) {
      req.statusCode = 400;
      throw new Error("You cannot delete your own account");
    }

    const staff = await Admin.findById(id);
    if (!staff) {
      req.statusCode = 404;
      throw new Error("Staff member not found");
    }

    staff.isDeleted = true;
    staff.isActive = false;
    await staff.save();

    req.rData = null;
    req.msg = "staff_deleted";
    next();
  };

  const toggleStaffStatus = async (req, res, next) => {
    console.log("StaffController => toggleStaffStatus");
    const { id } = req.params;

    const staff = await Admin.findById(id);
    if (!staff) {
      req.statusCode = 404;
      throw new Error("Staff member not found");
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    req.rData = { isActive: staff.isActive };
    req.msg = "status_updated";
    next();
  };

  return {
    getStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
  };
};
