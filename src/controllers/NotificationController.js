const NotificationService = require("../services/NotificationService");

module.exports = () => {
  // ============ USER-FACING ============

  const listMine = async (req, res, next) => {
    console.log("NotificationController => listMine");
    const userId = req.body.userId;
    if (!userId) {
      req.statusCode = 401;
      throw new Error("Unauthorized");
    }
    const { page, limit } = req.query;
    const result = await NotificationService().listForUser(userId, {
      page: page || 1,
      limit: limit || 20,
    });
    req.rData = result;
    req.msg = "success";
    next();
  };

  const unreadCount = async (req, res, next) => {
    console.log("NotificationController => unreadCount");
    const userId = req.body.userId;
    if (!userId) {
      req.statusCode = 401;
      throw new Error("Unauthorized");
    }
    const count = await NotificationService().unreadCountForUser(userId);
    req.rData = { unreadCount: count };
    req.msg = "success";
    next();
  };

  const markRead = async (req, res, next) => {
    console.log("NotificationController => markRead");
    const userId = req.body.userId;
    if (!userId) {
      req.statusCode = 401;
      throw new Error("Unauthorized");
    }
    const updated = await NotificationService().markRead(req.params.id, userId);
    req.rData = updated;
    req.msg = "success";
    next();
  };

  const markAllRead = async (req, res, next) => {
    console.log("NotificationController => markAllRead");
    const userId = req.body.userId;
    if (!userId) {
      req.statusCode = 401;
      throw new Error("Unauthorized");
    }
    await NotificationService().markAllRead(userId);
    req.rData = null;
    req.msg = "success";
    next();
  };

  // ============ ADMIN ============

  const adminList = async (req, res, next) => {
    console.log("NotificationController => adminList");
    const { page, limit } = req.query;
    const result = await NotificationService().adminList({
      page: page || 1,
      limit: limit || 20,
    });
    req.rData = result;
    req.msg = "success";
    next();
  };

  const adminSend = async (req, res, next) => {
    console.log("NotificationController => adminSend");
    const { userId, title, message, link, type } = req.body;
    const adminId = req.admin?.id;

    if (!title || !message) {
      req.statusCode = 400;
      throw new Error("title and message are required");
    }

    let notif;
    if (userId) {
      notif = await NotificationService().createForUser({
        userId,
        title,
        message,
        link: link || "",
        type: type || "system",
        createdBy: adminId,
      });
    } else {
      notif = await NotificationService().createBroadcast({
        title,
        message,
        link: link || "",
        type: type || "broadcast",
        createdBy: adminId,
      });
    }

    req.rData = notif;
    req.msg = "success";
    next();
  };

  return {
    listMine,
    unreadCount,
    markRead,
    markAllRead,
    adminList,
    adminSend,
  };
};
