"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("@koa/router"));
const zod_1 = require("zod");
const adminController = __importStar(require("./admin.controller"));
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const types_1 = require("@/types");
const router = new router_1.default();
const approveWithdrawalSchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid(),
});
const verifyUserDetailSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(types_1.UserDetailStatus).refine(status => [types_1.UserDetailStatus.APPROVED, types_1.UserDetailStatus.REJECTED].includes(status), { message: 'Status must be either APPROVED or REJECTED' }),
    rejectionReason: zod_1.z.string().optional(),
});
const testEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const markNotificationAsReadSchema = zod_1.z.object({
    notificationId: zod_1.z.string().uuid(),
});
const approveWalletLoadRequestSchema = zod_1.z.object({
    loadRequestId: zod_1.z.string().uuid(),
    adminRemark: zod_1.z.string().optional(),
});
const rejectWalletLoadRequestSchema = zod_1.z.object({
    loadRequestId: zod_1.z.string().uuid(),
    rejectionReason: zod_1.z.string().min(1, 'Rejection reason is required'),
    adminRemark: zod_1.z.string().optional(),
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
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getUsers);
router.post('/approve-withdrawal', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(approveWithdrawalSchema), adminController.approveWithdrawal);
router.get('/game-monitoring', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getGameMonitoring);
router.post('/userDetail-verify', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(verifyUserDetailSchema), adminController.verifyUserDetail);
router.get('/logs', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getLogs);
router.post('/test-email', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(testEmailSchema), adminController.testEmail);
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
router.get('/notifications', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getNotifications);
router.post('/notifications/mark-read', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(markNotificationAsReadSchema), adminController.markNotificationAsRead);
router.get('/notifications/unread-count', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getUnreadNotificationCount);
// Wallet load request routes
router.get('/wallet-load-requests', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), adminController.getWalletLoadRequests);
router.post('/wallet-load-requests/approve', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(approveWalletLoadRequestSchema), adminController.approveWalletLoadRequest);
router.post('/wallet-load-requests/reject', auth_1.authenticate, (0, auth_1.authorize)('admin', 'super_admin'), (0, validation_1.validate)(rejectWalletLoadRequestSchema), adminController.rejectWalletLoadRequest);
exports.default = router;
