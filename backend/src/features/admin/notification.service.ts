import AppDataSource from '@/config/database';
import { AdminNotification } from '@/models/AdminNotification.entity';

export const createNotification = async (
  type: string,
  relatedEntityId: string,
  message: string
): Promise<AdminNotification> => {
  const notificationRepository = AppDataSource.getRepository(AdminNotification);

  const notification = notificationRepository.create({
    type,
    relatedEntityId,
    message,
    isRead: false,
  });

  return await notificationRepository.save(notification);
};

export const markNotificationAsRead = async (
  notificationId: string,
  readBy: string
): Promise<AdminNotification> => {
  const notificationRepository = AppDataSource.getRepository(AdminNotification);

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

export const getNotifications = async (
  page: number = 1,
  limit: number = 20,
  isRead?: boolean
): Promise<{ notifications: AdminNotification[]; pagination: any }> => {
  const skip = (page - 1) * limit;
  const notificationRepository = AppDataSource.getRepository(AdminNotification);

  const where: any = {};
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

export const getUnreadCount = async (): Promise<number> => {
  const notificationRepository = AppDataSource.getRepository(AdminNotification);

  return await notificationRepository.count({
    where: { isRead: false },
  });
};

