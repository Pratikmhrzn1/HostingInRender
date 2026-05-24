import AppDataSource from '@/config/database';
import { Wallet } from '@/models/Wallet.entity';
import { WalletLoadRequest, PaymentMethod, LoadRequestStatus } from '@/models/WalletLoadRequest.entity';
import { WalletTransaction, TransactionType, TransactionSource } from '@/models/WalletTransaction.entity';
import * as notificationService from '@/features/admin/notification.service';

export const requestWalletLoad = async (
  userId: string,
  walletId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionReference?: string,
  userNote?: string,
  proofImageUrl?: string
): Promise<any> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest);

    const loadRequest = loadRequestRepository.create({
      userId,
      walletId,
      amount,
      paymentMethod,
      transactionReference,
      userNote,
      proofImageUrl,
      status: LoadRequestStatus.PENDING,
    });

    await loadRequestRepository.save(loadRequest);
    await queryRunner.commitTransaction();

    // Create admin notification (outside transaction to avoid conflicts)
    try {
      await notificationService.createNotification(
        'wallet_load_request',
        loadRequest.id,
        `New wallet load request: ${amount} ${loadRequest.currency} via ${paymentMethod}`
      );
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('Failed to create admin notification:', notificationError);
    }

    return {
      loadRequestId: loadRequest.id,
      amount,
      status: loadRequest.status,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export const getWalletLoadRequests = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<any> => {
  const skip = (page - 1) * limit;
  const loadRequestRepository = AppDataSource.getRepository(WalletLoadRequest);

  const [requests, total] = await loadRequestRepository.findAndCount({
    where: { userId },
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });

  return {
    requests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const requestWithdrawal = async (
  userId: string,
  walletId: string,
  amount: number,
  bankDetails?: any,
  upiId?: string
): Promise<any> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const walletRepository = queryRunner.manager.getRepository(Wallet);
    const transactionRepository = queryRunner.manager.getRepository(WalletTransaction);

    const wallet = await walletRepository.findOne({ where: { userId } });
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const availableBalance = parseFloat(wallet.balance.toString()) - parseFloat(wallet.lockedAmount.toString());
    
    if (availableBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore - amount;

    wallet.balance = balanceAfter;
    wallet.lockedAmount = parseFloat(wallet.lockedAmount.toString()) + amount;
    await walletRepository.save(wallet);

    const transaction = transactionRepository.create({
      walletId,
      userId,
      type: TransactionType.DEBIT,
      source: TransactionSource.WITHDRAWAL,
      amount,
      balanceBefore,
      balanceAfter,
      description: 'Withdrawal request',
      metadata: JSON.stringify({ bankDetails, upiId }),
    });

    await transactionRepository.save(transaction);
    await queryRunner.commitTransaction();

    return {
      transactionId: transaction.id,
      amount,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export const approveWalletLoadRequest = async (
  loadRequestId: string,
  adminId: string,
  adminRemark?: string
): Promise<any> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest);
    const walletRepository = queryRunner.manager.getRepository(Wallet);
    const transactionRepository = queryRunner.manager.getRepository(WalletTransaction);

    const loadRequest = await loadRequestRepository.findOne({
      where: { id: loadRequestId },
      relations: ['wallet'],
    });

    if (!loadRequest) {
      throw new Error('Load request not found');
    }

    if (loadRequest.status !== LoadRequestStatus.PENDING) {
      throw new Error('Load request is not pending');
    }

    const wallet = await walletRepository.findOne({ where: { id: loadRequest.walletId } });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + parseFloat(loadRequest.amount.toString());

    wallet.balance = balanceAfter;
    await walletRepository.save(wallet);

    loadRequest.status = LoadRequestStatus.APPROVED;
    loadRequest.reviewedBy = adminId;
    loadRequest.reviewedAt = new Date();
    loadRequest.adminRemark = adminRemark;
    await loadRequestRepository.save(loadRequest);

    const transaction = transactionRepository.create({
      walletId: wallet.id,
      userId: loadRequest.userId,
      type: TransactionType.CREDIT,
      source: TransactionSource.WALLET_LOAD,
      amount: parseFloat(loadRequest.amount.toString()),
      balanceBefore,
      balanceAfter,
      loadRequestId: loadRequest.id,
      description: `Wallet load approved - ${loadRequest.paymentMethod}`,
      metadata: JSON.stringify({ paymentMethod: loadRequest.paymentMethod, transactionReference: loadRequest.transactionReference }),
    });

    await transactionRepository.save(transaction);
    await queryRunner.commitTransaction();

    return {
      loadRequestId: loadRequest.id,
      amount: parseFloat(loadRequest.amount.toString()),
      balance: balanceAfter,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export const rejectWalletLoadRequest = async (
  loadRequestId: string,
  adminId: string,
  rejectionReason: string,
  adminRemark?: string
): Promise<any> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest);

    const loadRequest = await loadRequestRepository.findOne({
      where: { id: loadRequestId },
    });

    if (!loadRequest) {
      throw new Error('Load request not found');
    }

    if (loadRequest.status !== LoadRequestStatus.PENDING) {
      throw new Error('Load request is not pending');
    }

    loadRequest.status = LoadRequestStatus.REJECTED;
    loadRequest.reviewedBy = adminId;
    loadRequest.reviewedAt = new Date();
    loadRequest.rejectionReason = rejectionReason;
    loadRequest.adminRemark = adminRemark;
    await loadRequestRepository.save(loadRequest);

    await queryRunner.commitTransaction();

    return {
      loadRequestId: loadRequest.id,
      status: loadRequest.status,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};
