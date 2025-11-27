import { db } from '../../core/database/client.js';
import { logger } from '../../core/utils/logger.js';
import { NotificationType, Prisma } from '@prisma/client';

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  relatedEntityType: true,
  relatedEntityId: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function listNotifications(userId: string, params: ListNotificationsParams = {}) {
  const { page = 1, limit = 20, isRead, type } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = { userId };

  if (isRead !== undefined) where.isRead = isRead;
  if (type) where.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      select: notificationSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getNotificationById(id: string, userId: string) {
  const notification = await db.notification.findUnique({
    where: { id },
    select: notificationSelect,
  });

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  return notification;
}

export async function markAsRead(id: string, userId: string) {
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  const updated = await db.notification.update({
    where: { id },
    data: { isRead: true },
    select: notificationSelect,
  });

  return updated;
}

export async function markAllAsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { success: true };
}

export async function deleteNotification(id: string, userId: string) {
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  await db.notification.delete({ where: { id } });

  return { success: true };
}

export async function deleteAllRead(userId: string) {
  await db.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return { success: true };
}

export async function getUnreadCount(userId: string) {
  const count = await db.notification.count({
    where: { userId, isRead: false },
  });

  return { count };
}

// ============================================
// NOTIFICATION CREATION HELPERS
// ============================================

export async function createNotification(data: CreateNotificationData) {
  const notification = await db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
    },
    select: notificationSelect,
  });

  logger.info(`Notification created for user ${data.userId}: ${data.title}`);

  return notification;
}

export async function createBulkNotifications(notifications: CreateNotificationData[]) {
  const created = await Promise.all(
    notifications.map(data =>
      db.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          relatedEntityType: data.relatedEntityType,
          relatedEntityId: data.relatedEntityId,
        },
        select: notificationSelect,
      })
    )
  );

  logger.info(`${created.length} notifications created`);

  return created;
}

// ============================================
// NOTIFICATION TRIGGERS (for use from other modules)
// ============================================

export async function notifyTaskAssignment(
  userId: string,
  taskId: string,
  taskTitle: string,
  projectName: string
) {
  return createNotification({
    userId,
    type: NotificationType.ASSIGNMENT,
    title: 'New Task Assignment',
    message: `You have been assigned to task "${taskTitle}" in project ${projectName}`,
    relatedEntityType: 'Task',
    relatedEntityId: taskId,
  });
}

export async function notifyProjectAssignment(
  userId: string,
  projectId: string,
  projectName: string,
  role: string
) {
  return createNotification({
    userId,
    type: NotificationType.ASSIGNMENT,
    title: 'New Project Assignment',
    message: `You have been assigned to project "${projectName}" as ${role}`,
    relatedEntityType: 'Project',
    relatedEntityId: projectId,
  });
}

export async function notifyMilestoneDeadline(
  userId: string,
  milestoneId: string,
  milestoneName: string,
  projectName: string,
  dueDate: Date
) {
  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgency = daysUntil <= 0 ? 'overdue' : daysUntil <= 3 ? 'due soon' : 'upcoming';

  return createNotification({
    userId,
    type: NotificationType.DEADLINE,
    title: `Milestone ${urgency}`,
    message: `Milestone "${milestoneName}" in ${projectName} is ${urgency}`,
    relatedEntityType: 'Milestone',
    relatedEntityId: milestoneId,
  });
}

export async function notifyTaskStatusChange(
  userId: string,
  taskId: string,
  taskTitle: string,
  newStatus: string
) {
  return createNotification({
    userId,
    type: NotificationType.STATUS_CHANGE,
    title: 'Task Status Updated',
    message: `Task "${taskTitle}" status changed to ${newStatus}`,
    relatedEntityType: 'Task',
    relatedEntityId: taskId,
  });
}

export async function notifyTimeOffApproval(
  userId: string,
  timeOffId: string,
  status: 'approved' | 'rejected',
  startDate: Date,
  endDate: Date
) {
  const dateRange = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0]
    ? startDate.toLocaleDateString()
    : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return createNotification({
    userId,
    type: NotificationType.APPROVAL_REQUEST,
    title: `Time-Off ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: `Your time-off request for ${dateRange} has been ${status}`,
    relatedEntityType: 'TimeOffRequest',
    relatedEntityId: timeOffId,
  });
}

export async function notifyTimeOffRequest(
  managerId: string,
  timeOffId: string,
  employeeName: string,
  startDate: Date,
  endDate: Date
) {
  const dateRange = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0]
    ? startDate.toLocaleDateString()
    : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return createNotification({
    userId: managerId,
    type: NotificationType.APPROVAL_REQUEST,
    title: 'Time-Off Request',
    message: `${employeeName} has requested time-off for ${dateRange}`,
    relatedEntityType: 'TimeOffRequest',
    relatedEntityId: timeOffId,
  });
}

export async function notifyMention(
  userId: string,
  mentionedBy: string,
  context: string,
  entityType: string,
  entityId: string
) {
  return createNotification({
    userId,
    type: NotificationType.MENTION,
    title: 'You were mentioned',
    message: `${mentionedBy} mentioned you in ${context}`,
    relatedEntityType: entityType,
    relatedEntityId: entityId,
  });
}

export async function notifySystem(
  userId: string,
  title: string,
  message: string
) {
  return createNotification({
    userId,
    type: NotificationType.SYSTEM,
    title,
    message,
  });
}
