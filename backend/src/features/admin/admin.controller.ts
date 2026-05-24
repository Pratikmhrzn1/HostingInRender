import { Context } from 'koa';
import fs from 'fs';
import path from 'path';
import AppDataSource from '@/config/database';
import { User } from '@/models/User.entity';
import { Transaction } from '@/models/Transaction.entity';
import { Game } from '@/models/Game.entity';
import { UserDetail } from '@/models/UserDetail.entity';
import { WalletLoadRequest } from '@/models/WalletLoadRequest.entity';
import { successResponse, errorResponse } from '@/utils/response';
import { CustomContext, GamePhase, TransactionStatus, UserDetailStatus } from '@/types';
import * as authService from '@/features/auth/auth.service';
import * as notificationService from './notification.service';
import * as walletService from '@/features/wallet/wallet.service';

export const getUsers = async (ctx: CustomContext): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user');

    if (status) {
      queryBuilder.where('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.phone LIKE :search OR user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(Number(limit))
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    successResponse(ctx, {
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
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get users', 500);
  }
};

export const approveWithdrawal = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { transactionId } = ctx.state.validated;

    const transactionRepository = AppDataSource.getRepository(Transaction);
    const transaction = await transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user'],
    });

    if (!transaction) {
      errorResponse(ctx, 'Transaction not found', 404);
      return;
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      errorResponse(ctx, 'Transaction is not pending', 400);
      return;
    }

    transaction.status = TransactionStatus.COMPLETED;
    transaction.metadata = {
      ...transaction.metadata,
      approvedBy: ctx.user.id,
      approvedAt: new Date(),
    };

    await transactionRepository.save(transaction);

    successResponse(ctx, { transactionId, status: TransactionStatus.COMPLETED }, 'Withdrawal approved');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to approve withdrawal', 500);
  }
};

export const getGameMonitoring = async (ctx: Context): Promise<void> => {
  try {
    const gameRepository = AppDataSource.getRepository(Game);
    const allGames = await gameRepository.find({
      take: 100,
      order: { createdAt: 'DESC' },
    });

    // Filter games with betting phase
    const activeGames = allGames.filter(
      (game: Game) => game.gameState?.phase === GamePhase.BETTING
    ).slice(0, 50);

    successResponse(ctx, {
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
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get game monitoring', 500);
  }
};

export const verifyUserDetail = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { userId, status, rejectionReason } = ctx.state.validated;

    const userDetailRepository = AppDataSource.getRepository(UserDetail);
    const userRepository = AppDataSource.getRepository(User);

    const userDetail = await userDetailRepository.findOne({ where: { userId } });
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!userDetail || !user) {
      errorResponse(ctx, 'UserDetail or user not found', 404);
      return;
    }

    userDetail.status = status;
    userDetail.verifiedBy = ctx.user.id;
    userDetail.verifiedAt = new Date();

    if ((status === UserDetailStatus.REJECTED || status === UserDetailStatus.CHANGES_REQUESTED) && rejectionReason) {
      userDetail.rejectionReason = rejectionReason;
    }

    if (status === UserDetailStatus.VERIFIED) {
      user.isUserDetailVerified = true;
      await userRepository.save(user);
    }

    await userDetailRepository.save(userDetail);

    successResponse(ctx, { userId, status }, 'UserDetail verification updated');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to verify UserDetail', 500);
  }
};

export const getLogs = async (ctx: Context): Promise<void> => {
  try {
    const limit = parseInt(ctx.query.limit as string || '100', 10);
    const logFilePath = path.join(process.cwd(), 'combined.log');

    if (!fs.existsSync(logFilePath)) {
      successResponse(ctx, { logs: [] }, 'No logs found');
      return;
    }

    const data = fs.readFileSync(logFilePath, 'utf8');
    const lines = data.trim().split('\n');
    const logs = lines.slice(-limit);

    successResponse(ctx, { logs }, 'Logs retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to retrieve logs', 500);
  }
};

export const testEmail = async (ctx: Context): Promise<void> => {
  try {
    const { email } = ctx.request.body as { email: string };

    if (!email) {
      errorResponse(ctx, 'Email is required', 400);
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

    successResponse(ctx, { email, sent: true }, 'Test email sent successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to send test email', 500);
  }
};

export const getNotifications = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { page = 1, limit = 20, isRead } = ctx.query;
    const isReadFilter = isRead !== undefined ? isRead === 'true' : undefined;

    const result = await notificationService.getNotifications(
      Number(page),
      Number(limit),
      isReadFilter
    );

    successResponse(ctx, result, 'Notifications retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get notifications', 500);
  }
};

export const markNotificationAsRead = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { notificationId } = ctx.state.validated;

    const notification = await notificationService.markNotificationAsRead(
      notificationId,
      ctx.user.id
    );

    successResponse(ctx, notification, 'Notification marked as read');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to mark notification as read', 500);
  }
};

export const getUnreadNotificationCount = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const count = await notificationService.getUnreadCount();

    successResponse(ctx, { count }, 'Unread count retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get unread count', 500);
  }
};

export const getWalletLoadRequests = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { page = 1, limit = 20, status } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    const loadRequestRepository = AppDataSource.getRepository(WalletLoadRequest);
    const where: any = {};
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

    successResponse(ctx, {
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
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get wallet load requests', 500);
  }
};

export const approveWalletLoadRequest = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { loadRequestId, adminRemark } = ctx.state.validated;

    const result = await walletService.approveWalletLoadRequest(
      loadRequestId,
      ctx.user.id,
      adminRemark
    );

    successResponse(ctx, result, 'Wallet load request approved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to approve wallet load request', 500);
  }
};

export const rejectWalletLoadRequest = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { loadRequestId, rejectionReason, adminRemark } = ctx.state.validated;

    const result = await walletService.rejectWalletLoadRequest(
      loadRequestId,
      ctx.user.id,
      rejectionReason,
      adminRemark
    );

    successResponse(ctx, result, 'Wallet load request rejected successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to reject wallet load request', 500);
  }
};
