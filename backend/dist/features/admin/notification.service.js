"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.getNotifications = exports.markNotificationAsRead = exports.createNotification = void 0;
const database_1 = __importDefault(require("@/config/database"));
const AdminNotification_entity_1 = require("@/models/AdminNotification.entity");
const createNotification = async (type, relatedEntityId, message) => {
    const notificationRepository = database_1.default.getRepository(AdminNotification_entity_1.AdminNotification);
    const notification = notificationRepository.create({
        type,
        relatedEntityId,
        message,
        isRead: false,
    });
    return await notificationRepository.save(notification);
};
exports.createNotification = createNotification;
const markNotificationAsRead = async (notificationId, readBy) => {
    const notificationRepository = database_1.default.getRepository(AdminNotification_entity_1.AdminNotification);
    const notification = await notificationRepository.findOne({
        where: { id: notificationId },
    });
    if (!notification) {
        throw new Error('Notification not found');
    }
    notification.isRead = true;
    notification.readBy = readBy;
    notification.readAt = new Date();
    return await notificationRepository.save(notification);
};
exports.markNotificationAsRead = markNotificationAsRead;
const getNotifications = async (page = 1, limit = 20, isRead) => {
    const skip = (page - 1) * limit;
    const notificationRepository = database_1.default.getRepository(AdminNotification_entity_1.AdminNotification);
    const where = {};
    if (isRead !== undefined) {
        where.isRead = isRead;
    }
    const [notifications, total] = await notificationRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
    });
    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getNotifications = getNotifications;
const getUnreadCount = async () => {
    const notificationRepository = database_1.default.getRepository(AdminNotification_entity_1.AdminNotification);
    return await notificationRepository.count({
        where: { isRead: false },
    });
};
exports.getUnreadCount = getUnreadCount;
