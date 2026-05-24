import Router from '@koa/router';
import { z } from 'zod';
import * as adminController from './admin.controller';
import { validate } from '@/middleware/validation';
import { authenticate, authorize } from '@/middleware/auth';
import {UserDetailStatus} from "@/types";

const router = new Router();

const approveWithdrawalSchema = z.object({
  transactionId: z.string().uuid(),
});

const verifyUserDetailSchema = z.object({
  userId: z.string().uuid(),
  status: z.nativeEnum(UserDetailStatus).refine(
    status => [UserDetailStatus.APPROVED, UserDetailStatus.REJECTED].includes(status),
    { message: 'Status must be either APPROVED or REJECTED' }
  ),
  rejectionReason: z.string().optional(),
});

const testEmailSchema = z.object({
  email: z.string().email(),
});

const markNotificationAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

const approveWalletLoadRequestSchema = z.object({
  loadRequestId: z.string().uuid(),
  adminRemark: z.string().optional(),
});

const rejectWalletLoadRequestSchema = z.object({
  loadRequestId: z.string().uuid(),
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
  adminRemark: z.string().optional(),
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, banned]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/users', authenticate, authorize('admin', 'super_admin'), adminController.getUsers);
router.post('/approve-withdrawal', authenticate, authorize('admin', 'super_admin'), validate(approveWithdrawalSchema), adminController.approveWithdrawal);
router.get('/game-monitoring', authenticate, authorize('admin', 'super_admin'), adminController.getGameMonitoring);
router.post('/userDetail-verify', authenticate, authorize('admin', 'super_admin'), validate(verifyUserDetailSchema), adminController.verifyUserDetail);
router.get('/logs', authenticate, authorize('admin', 'super_admin'), adminController.getLogs);
router.post('/test-email', authenticate, authorize('admin', 'super_admin'), validate(testEmailSchema), adminController.testEmail);

// Notification routes
/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Get admin notifications (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           message:
 *                             type: string
 *                           isRead:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/notifications', authenticate, authorize('admin', 'super_admin'), adminController.getNotifications);
router.post('/notifications/mark-read', authenticate, authorize('admin', 'super_admin'), validate(markNotificationAsReadSchema), adminController.markNotificationAsRead);
router.get('/notifications/unread-count', authenticate, authorize('admin', 'super_admin'), adminController.getUnreadNotificationCount);

// Wallet load request routes
router.get('/wallet-load-requests', authenticate, authorize('admin', 'super_admin'), adminController.getWalletLoadRequests);
router.post('/wallet-load-requests/approve', authenticate, authorize('admin', 'super_admin'), validate(approveWalletLoadRequestSchema), adminController.approveWalletLoadRequest);
router.post('/wallet-load-requests/reject', authenticate, authorize('admin', 'super_admin'), validate(rejectWalletLoadRequestSchema), adminController.rejectWalletLoadRequest);

export default router;
