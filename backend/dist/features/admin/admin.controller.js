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
exports.rejectWalletLoadRequest = exports.approveWalletLoadRequest = exports.getWalletLoadRequests = exports.getUnreadNotificationCount = exports.markNotificationAsRead = exports.getNotifications = exports.testEmail = exports.getLogs = exports.verifyUserDetail = exports.getGameMonitoring = exports.approveWithdrawal = exports.getUsers = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("@/config/database"));
const User_entity_1 = require("@/models/User.entity");
const Transaction_entity_1 = require("@/models/Transaction.entity");
const Game_entity_1 = require("@/models/Game.entity");
const UserDetail_entity_1 = require("@/models/UserDetail.entity");
const WalletLoadRequest_entity_1 = require("@/models/WalletLoadRequest.entity");
const response_1 = require("@/utils/response");
const types_1 = require("@/types");
const authService = __importStar(require("@/features/auth/auth.service"));
const notificationService = __importStar(require("./notification.service"));
const walletService = __importStar(require("@/features/wallet/wallet.service"));
const getUsers = async (ctx) => {
    try {
        const { page = 1, limit = 20, status, search } = ctx.query;
        const skip = (Number(page) - 1) * Number(limit);
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const queryBuilder = userRepository.createQueryBuilder('user');
        if (status) {
            queryBuilder.where('user.status = :status', { status });
        }
        if (search) {
            queryBuilder.andWhere('(user.phone LIKE :search OR user.name LIKE :search OR user.email LIKE :search)', { search: `%${search}%` });
        }
        const [users, total] = await queryBuilder
            .skip(skip)
            .take(Number(limit))
            .orderBy('user.createdAt', 'DESC')
            .getManyAndCount();
        (0, response_1.successResponse)(ctx, {
            users: users.map(u => ({
                id: u.id,
                phone: u.phone,
                name: u.name,
                email: u.email,
                status: u.status,
                isUserDetailVerified: u.isUserDetailVerified,
                createdAt: u.createdAt,
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Users retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get users', 500);
    }
};
exports.getUsers = getUsers;
const approveWithdrawal = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { transactionId } = ctx.state.validated;
        const transactionRepository = database_1.default.getRepository(Transaction_entity_1.Transaction);
        const transaction = await transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['user'],
        });
        if (!transaction) {
            (0, response_1.errorResponse)(ctx, 'Transaction not found', 404);
            return;
        }
        if (transaction.status !== types_1.TransactionStatus.PENDING) {
            (0, response_1.errorResponse)(ctx, 'Transaction is not pending', 400);
            return;
        }
        transaction.status = types_1.TransactionStatus.COMPLETED;
        transaction.metadata = {
            ...transaction.metadata,
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
        };
        await transactionRepository.save(transaction);
        (0, response_1.successResponse)(ctx, { transactionId, status: types_1.TransactionStatus.COMPLETED }, 'Withdrawal approved');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to approve withdrawal', 500);
    }
};
exports.approveWithdrawal = approveWithdrawal;
const getGameMonitoring = async (ctx) => {
    try {
        const gameRepository = database_1.default.getRepository(Game_entity_1.Game);
        const allGames = await gameRepository.find({
            take: 100,
            order: { createdAt: 'DESC' },
        });
        // Filter games with betting phase
        const activeGames = allGames.filter((game) => game.gameState?.phase === types_1.GamePhase.BETTING).slice(0, 50);
        (0, response_1.successResponse)(ctx, {
            activeGames: activeGames.map(g => ({
                id: g.id,
                tableId: g.tableId,
                gameType: g.gameType,
                players: g.currentPlayers.length,
                pot: g.gameState.pot,
                phase: g.gameState.phase,
                startedAt: g.startedAt,
            })),
            totalActive: activeGames.length,
        }, 'Game monitoring data retrieved');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get game monitoring', 500);
    }
};
exports.getGameMonitoring = getGameMonitoring;
const verifyUserDetail = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { userId, status, rejectionReason } = ctx.state.validated;
        const userDetailRepository = database_1.default.getRepository(UserDetail_entity_1.UserDetail);
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const userDetail = await userDetailRepository.findOne({ where: { userId } });
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!userDetail || !user) {
            (0, response_1.errorResponse)(ctx, 'UserDetail or user not found', 404);
            return;
        }
        userDetail.status = status;
        userDetail.verifiedBy = ctx.user.id;
        userDetail.verifiedAt = new Date();
        if ((status === types_1.UserDetailStatus.REJECTED || status === types_1.UserDetailStatus.CHANGES_REQUESTED) && rejectionReason) {
            userDetail.rejectionReason = rejectionReason;
        }
        if (status === types_1.UserDetailStatus.VERIFIED) {
            user.isUserDetailVerified = true;
            await userRepository.save(user);
        }
        await userDetailRepository.save(userDetail);
        (0, response_1.successResponse)(ctx, { userId, status }, 'UserDetail verification updated');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to verify UserDetail', 500);
    }
};
exports.verifyUserDetail = verifyUserDetail;
const getLogs = async (ctx) => {
    try {
        const limit = parseInt(ctx.query.limit || '100', 10);
        const logFilePath = path_1.default.join(process.cwd(), 'combined.log');
        if (!fs_1.default.existsSync(logFilePath)) {
            (0, response_1.successResponse)(ctx, { logs: [] }, 'No logs found');
            return;
        }
        const data = fs_1.default.readFileSync(logFilePath, 'utf8');
        const lines = data.trim().split('\n');
        const logs = lines.slice(-limit);
        (0, response_1.successResponse)(ctx, { logs }, 'Logs retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to retrieve logs', 500);
    }
};
exports.getLogs = getLogs;
const testEmail = async (ctx) => {
    try {
        const { email } = ctx.request.body;
        if (!email) {
            (0, response_1.errorResponse)(ctx, 'Email is required', 400);
            return;
        }
        const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Test Email</h2>
        <p>This is a test email from the Game Platform API.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      </div>
    `;
        await authService.sendEmail(email, 'Test Email - Game Platform', html);
        (0, response_1.successResponse)(ctx, { email, sent: true }, 'Test email sent successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to send test email', 500);
    }
};
exports.testEmail = testEmail;
const getNotifications = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { page = 1, limit = 20, isRead } = ctx.query;
        const isReadFilter = isRead !== undefined ? isRead === 'true' : undefined;
        const result = await notificationService.getNotifications(Number(page), Number(limit), isReadFilter);
        (0, response_1.successResponse)(ctx, result, 'Notifications retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get notifications', 500);
    }
};
exports.getNotifications = getNotifications;
const markNotificationAsRead = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { notificationId } = ctx.state.validated;
        const notification = await notificationService.markNotificationAsRead(notificationId, ctx.user.id);
        (0, response_1.successResponse)(ctx, notification, 'Notification marked as read');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to mark notification as read', 500);
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
const getUnreadNotificationCount = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const count = await notificationService.getUnreadCount();
        (0, response_1.successResponse)(ctx, { count }, 'Unread count retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get unread count', 500);
    }
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const getWalletLoadRequests = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { page = 1, limit = 20, status } = ctx.query;
        const skip = (Number(page) - 1) * Number(limit);
        const loadRequestRepository = database_1.default.getRepository(WalletLoadRequest_entity_1.WalletLoadRequest);
        const where = {};
        if (status) {
            where.status = status;
        }
        const [requests, total] = await loadRequestRepository.findAndCount({
            where,
            relations: ['user', 'wallet'],
            order: { createdAt: 'DESC' },
            skip,
            take: Number(limit),
        });
        (0, response_1.successResponse)(ctx, {
            requests: requests.map(r => ({
                id: r.id,
                userId: r.userId,
                walletId: r.walletId,
                amount: parseFloat(r.amount.toString()),
                currency: r.currency,
                paymentMethod: r.paymentMethod,
                transactionReference: r.transactionReference,
                userNote: r.userNote,
                proofImageUrl: r.proofImageUrl,
                status: r.status,
                reviewedBy: r.reviewedBy,
                reviewedAt: r.reviewedAt,
                adminRemark: r.adminRemark,
                rejectionReason: r.rejectionReason,
                resubmissionCount: r.resubmissionCount,
                originalRequestId: r.originalRequestId,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                user: r.user ? {
                    id: r.user.id,
                    name: r.user.name,
                    email: r.user.email,
                    phone: r.user.phone,
                } : null,
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        }, 'Wallet load requests retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get wallet load requests', 500);
    }
};
exports.getWalletLoadRequests = getWalletLoadRequests;
const approveWalletLoadRequest = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { loadRequestId, adminRemark } = ctx.state.validated;
        const result = await walletService.approveWalletLoadRequest(loadRequestId, ctx.user.id, adminRemark);
        (0, response_1.successResponse)(ctx, result, 'Wallet load request approved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to approve wallet load request', 500);
    }
};
exports.approveWalletLoadRequest = approveWalletLoadRequest;
const rejectWalletLoadRequest = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { loadRequestId, rejectionReason, adminRemark } = ctx.state.validated;
        const result = await walletService.rejectWalletLoadRequest(loadRequestId, ctx.user.id, rejectionReason, adminRemark);
        (0, response_1.successResponse)(ctx, result, 'Wallet load request rejected successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to reject wallet load request', 500);
    }
};
exports.rejectWalletLoadRequest = rejectWalletLoadRequest;
