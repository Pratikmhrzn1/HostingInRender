import AppDataSource from '@/config/database';
import { Wallet } from '@/models/Wallet.entity';
import { WalletTransaction } from '@/models/WalletTransaction.entity';
import { successResponse, errorResponse } from '@/utils/response';
import * as walletService from './wallet.service';
import { CustomContext } from '@/types';
import { PaymentMethod } from '@/models/WalletLoadRequest.entity';

export const getBalance = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const walletRepository = AppDataSource.getRepository(Wallet);
    const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });

    if (!wallet) {
      errorResponse(ctx, 'Wallet not found', 404);
      return;
    }

    const points = parseFloat(wallet.balance.toString());

    successResponse(ctx, {
      balance: parseFloat(wallet.balance.toString()),
      bonusBalance: parseFloat(wallet.bonusBalance.toString()),
      lockedAmount: parseFloat(wallet.lockedAmount.toString()),
      availableBalance: parseFloat(wallet.balance.toString()) - parseFloat(wallet.lockedAmount.toString()),
      points,
      currency: wallet.currency,
    }, 'Balance retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get balance', 500);
  }
};

export const getTransactions = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { page = 1, limit = 20 } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    const transactionRepository = AppDataSource.getRepository(WalletTransaction);
    const [transactions, total] = await transactionRepository.findAndCount({
      where: { userId: ctx.user.id },
      order: { createdAt: 'DESC' },
      skip,
      take: Number(limit),
    });

    successResponse(ctx, {
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        source: t.source,
        amount: parseFloat(t.amount.toString()),
        balanceBefore: parseFloat(t.balanceBefore.toString()),
        balanceAfter: parseFloat(t.balanceAfter.toString()),
        description: t.description,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
        createdAt: t.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Transactions retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get transactions', 500);
  }
};

export const requestWalletLoad = async (ctx: CustomContext): Promise<void> => {
  const proofImage = ctx.state.file; // This comes from our middleware
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { amount, paymentMethod, transactionReference, userNote } = ctx.state.validated;
    
    const walletRepository = AppDataSource.getRepository(Wallet);
    let wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
    
    if (!wallet) {
      wallet = walletRepository.create({ userId: ctx.user.id });
      await walletRepository.save(wallet);
    }

    // Handle file upload
    let proofImagePath = '';
    if (proofImage) {
      const { saveFile } = await import('@/utils/fileUpload');
      // Cast to Express.Multer.File since it comes from multer middleware
      proofImagePath = saveFile(proofImage as Express.Multer.File, 'wallet-load-proofs');
    } else if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
      throw new Error('Proof image is required for bank transfer');
    }

    const result = await walletService.requestWalletLoad(
      ctx.user.id,
      wallet.id,
      amount,
      transactionReference,
      userNote,
      proofImagePath
    );

    successResponse(ctx, result, 'Wallet load request submitted successfully');
  } catch (error: any) {
    // Clean up uploaded file if there was an error
    if (proofImage && (proofImage as Express.Multer.File).path) {
      const { deleteFile } = await import('@/utils/fileUpload');
      deleteFile((proofImage as Express.Multer.File).path);
    }
    errorResponse(ctx, error.message || 'Failed to request wallet load', error.status || 500);
  }
};

export const getWalletLoadRequests = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { page = 1, limit = 20 } = ctx.query;
    
    const result = await walletService.getWalletLoadRequests(
      ctx.user.id,
      Number(page),
      Number(limit)
    );

    successResponse(ctx, result, 'Load requests retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get load requests', 500);
  }
};

export const withdraw = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { amount, bankDetails, upiId } = ctx.state.validated;
    
    const walletRepository = AppDataSource.getRepository(Wallet);
    const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
    
    if (!wallet) {
      errorResponse(ctx, 'Wallet not found', 404);
      return;
    }
    
    const result = await walletService.requestWithdrawal(
      ctx.user.id,
      wallet.id,
      amount,
      bankDetails,
      upiId
    );

    successResponse(ctx, result, 'Withdrawal request submitted successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to request withdrawal', 500);
  }
};

export const getBonus = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const walletRepository = AppDataSource.getRepository(Wallet);
    const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });

    if (!wallet) {
      errorResponse(ctx, 'Wallet not found', 404);
      return;
    }

    successResponse(ctx, {
      bonusBalance: parseFloat(wallet.bonusBalance.toString()),
    }, 'Bonus balance retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get bonus', 500);
  }
};
