const RoleService = require("../services/RoleService");

module.exports = () => {
  const getRoles = async (req, res, next) => {
    console.log("RoleController => getRoles");
    const roles = await RoleService().getAll();
    req.rData = roles;
    req.msg = "success";
    next();
  };

  const getRoleById = async (req, res, next) => {
    console.log("RoleController => getRoleById");
    const role = await RoleService().getById(req.params.id);
    if (!role) {
      req.statusCode = 404;
      throw new Error("Role not found");
    }
    req.rData = role;
    req.msg = "success";
    next();
  };

  const createRole = async (req, res, next) => {
    console.log("RoleController => createRole");
    const { name, description, permissions } = req.body;
    const adminId = req.admin.id;

    if (!name) {
      req.statusCode = 400;
      throw new Error("Role name is required");
    }

    const role = await RoleService().create({
      name,
      description: description || "",
      permissions: permissions || [],
      createdBy: adminId,
    });

    req.rData = role;
    req.msg = "role_created";
    next();
  };

  const updateRole = async (req, res, next) => {
    console.log("RoleController => updateRole");
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const existing = await RoleService().getById(id);
    if (!existing) {
      req.statusCode = 404;
      throw new Error("Role not found");
    }

    if (existing.isSystem) {
      req.statusCode = 400;
      throw new Error("System roles cannot be modified");
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;

    const role = await RoleService().update(id, updateData);

    req.rData = role;
    req.msg = "role_updated";
    next();
  };

  const deleteRole = async (req, res, next) => {
    console.log("RoleController => deleteRole");
    const { id } = req.params;

    const existing = await RoleService().getById(id);
    if (!existing) {
      req.statusCode = 404;
      throw new Error("Role not found");
    }

    if (existing.isSystem) {
      req.statusCode = 400;
      throw new Error("System roles cannot be deleted");
    }

    await RoleService().remove(id);

    req.rData = null;
    req.msg = "role_deleted";
    next();
  };

  const toggleRoleStatus = async (req, res, next) => {
    console.log("RoleController => toggleRoleStatus");
    const role = await RoleService().toggleStatus(req.params.id);
    if (!role) {
      req.statusCode = 404;
      throw new Error("Role not found");
    }
    req.rData = { isActive: role.isActive };
    req.msg = "status_updated";
    next();
  };

  return {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    toggleRoleStatus,
  };
};
