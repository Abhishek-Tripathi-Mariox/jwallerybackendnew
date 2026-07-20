const Notification = require("../models/Notification");
const User = require("../models/User");
const mongoose = require("mongoose");
const { sendPushToToken, sendPushToTokens } = require("../util/firebaseAdmin");

const toObjectId = (id) =>
  id && !(id instanceof mongoose.Types.ObjectId)
    ? new mongoose.Types.ObjectId(id)
    : id;

module.exports = () => {
  /**
   * Create a notification for one user (userId required).
   */
  const createForUser = async ({ userId, type = "system", title, message, link = "", orderId = null, createdBy = null }) => {
    if (!userId) throw new Error("userId is required");
    const notification = await Notification.create({
      userId: toObjectId(userId),
      type,
      title,
      message,
      link,
      orderId: orderId ? toObjectId(orderId) : null,
      createdBy: createdBy ? toObjectId(createdBy) : null,
    });

    // Push is best-effort — a failed/unconfigured send must never fail the
    // notification write itself (the in-app bell already has it either way).
    try {
      const user = await User.findById(userId).select("deviceToken notificationAllowed");
      if (user?.deviceToken && user.notificationAllowed) {
        await sendPushToToken(user.deviceToken, {
          title,
          body: message,
          data: { type, link, notificationId: String(notification._id), orderId: orderId ? String(orderId) : "" },
        });
      }
    } catch (error) {
      console.error("Push send for createForUser failed:", error.message);
    }

    return notification;
  };

  /**
   * Create a broadcast notification (userId=null) visible to every user.
   */
  const createBroadcast = async ({ type = "broadcast", title, message, link = "", createdBy = null }) => {
    const notification = await Notification.create({
      userId: null,
      type,
      title,
      message,
      link,
      createdBy: createdBy ? toObjectId(createdBy) : null,
    });

    try {
      const users = await User.find({
        isActive: true,
        isDeleted: { $ne: true },
        notificationAllowed: true,
        deviceToken: { $nin: [null, ""] },
      }).select("deviceToken");
      const tokens = users.map((u) => u.deviceToken);
      if (tokens.length > 0) {
        await sendPushToTokens(tokens, {
          title,
          body: message,
          data: { type, link, notificationId: String(notification._id) },
        });
      }
    } catch (error) {
      console.error("Push send for createBroadcast failed:", error.message);
    }

    return notification;
  };

  /**
   * List notifications for a user: direct + broadcasts.
   * Adds an `isRead` flag per user (broadcasts use readBy).
   */
  const listForUser = async (userId, { page = 1, limit = 20 } = {}) => {
    const uid = toObjectId(userId);
    const query = { $or: [{ userId: uid }, { userId: null }] };

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
    ]);

    const items = docs.map((n) => {
      const isReadForUser = n.userId
        ? !!n.isRead
        : (n.readBy || []).some((id) => String(id) === String(uid));
      return {
        _id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        orderId: n.orderId,
        isBroadcast: !n.userId,
        isRead: isReadForUser,
        createdAt: n.createdAt,
      };
    });

    return { items, page: Number(page), limit: Number(limit), total };
  };

  /**
   * Unread count for a user across direct + broadcast.
   */
  const unreadCountForUser = async (userId) => {
    const uid = toObjectId(userId);
    const [direct, broadcast] = await Promise.all([
      Notification.countDocuments({ userId: uid, isRead: false }),
      Notification.countDocuments({ userId: null, readBy: { $ne: uid } }),
    ]);
    return direct + broadcast;
  };

  /**
   * Mark a single notification as read for a given user.
   */
  const markRead = async (notificationId, userId) => {
    const uid = toObjectId(userId);
    const n = await Notification.findById(notificationId);
    if (!n) return null;
    if (n.userId) {
      if (String(n.userId) !== String(uid)) return null; // not theirs
      n.isRead = true;
    } else {
      if (!n.readBy.some((id) => String(id) === String(uid))) {
        n.readBy.push(uid);
      }
    }
    await n.save();
    return n;
  };

  /**
   * Mark all (direct + broadcast) as read for a user.
   */
  const markAllRead = async (userId) => {
    const uid = toObjectId(userId);
    await Notification.updateMany(
      { userId: uid, isRead: false },
      { $set: { isRead: true } },
    );
    await Notification.updateMany(
      { userId: null, readBy: { $ne: uid } },
      { $addToSet: { readBy: uid } },
    );
    return true;
  };

  /**
   * Admin: list all notifications.
   */
  const adminList = async ({ page = 1, limit = 20 } = {}) => {
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("userId", "fullName email mobileNumber")
        .populate("createdBy", "name email")
        .lean(),
      Notification.countDocuments(),
    ]);
    return { items, page: Number(page), limit: Number(limit), total };
  };

  return {
    createForUser,
    createBroadcast,
    listForUser,
    unreadCountForUser,
    markRead,
    markAllRead,
    adminList,
  };
};
