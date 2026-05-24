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
exports.rejectWalletLoadRequest = exports.approveWalletLoadRequest = exports.requestWithdrawal = exports.getWalletLoadRequests = exports.requestWalletLoad = void 0;
const database_1 = __importDefault(require("@/config/database"));
const Wallet_entity_1 = require("@/models/Wallet.entity");
const WalletLoadRequest_entity_1 = require("@/models/WalletLoadRequest.entity");
const WalletTransaction_entity_1 = require("@/models/WalletTransaction.entity");
const notificationService = __importStar(require("@/features/admin/notification.service"));
const requestWalletLoad = async (userId, walletId, amount, paymentMethod, transactionReference, userNote, proofImageUrl) => {
    const queryRunner = database_1.default.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest_entity_1.WalletLoadRequest);
        const loadRequest = loadRequestRepository.create({
            userId,
            walletId,
            amount,
            paymentMethod,
            transactionReference,
            userNote,
            proofImageUrl,
            status: WalletLoadRequest_entity_1.LoadRequestStatus.PENDING,
        });
        await loadRequestRepository.save(loadRequest);
        await queryRunner.commitTransaction();
        // Create admin notification (outside transaction to avoid conflicts)
        try {
            await notificationService.createNotification('wallet_load_request', loadRequest.id, `New wallet load request: ${amount} ${loadRequest.currency} via ${paymentMethod}`);
        }
        catch (notificationError) {
            // Log error but don't fail the request
            console.error('Failed to create admin notification:', notificationError);
        }
        return {
            loadRequestId: loadRequest.id,
            amount,
            status: loadRequest.status,
        };
    }
    catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    }
    finally {
        await queryRunner.release();
    }
};
exports.requestWalletLoad = requestWalletLoad;
const getWalletLoadRequests = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const loadRequestRepository = database_1.default.getRepository(WalletLoadRequest_entity_1.WalletLoadRequest);
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
exports.getWalletLoadRequests = getWalletLoadRequests;
const requestWithdrawal = async (userId, walletId, amount, bankDetails, upiId) => {
    const queryRunner = database_1.default.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const walletRepository = queryRunner.manager.getRepository(Wallet_entity_1.Wallet);
        const transactionRepository = queryRunner.manager.getRepository(WalletTransaction_entity_1.WalletTransaction);
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
            type: WalletTransaction_entity_1.TransactionType.DEBIT,
            source: WalletTransaction_entity_1.TransactionSource.WITHDRAWAL,
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
    }
    catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    }
    finally {
        await queryRunner.release();
    }
};
exports.requestWithdrawal = requestWithdrawal;
const approveWalletLoadRequest = async (loadRequestId, adminId, adminRemark) => {
    const queryRunner = database_1.default.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest_entity_1.WalletLoadRequest);
        const walletRepository = queryRunner.manager.getRepository(Wallet_entity_1.Wallet);
        const transactionRepository = queryRunner.manager.getRepository(WalletTransaction_entity_1.WalletTransaction);
        const loadRequest = await loadRequestRepository.findOne({
            where: { id: loadRequestId },
            relations: ['wallet'],
        });
        if (!loadRequest) {
            throw new Error('Load request not found');
        }
        if (loadRequest.status !== WalletLoadRequest_entity_1.LoadRequestStatus.PENDING) {
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
        loadRequest.status = WalletLoadRequest_entity_1.LoadRequestStatus.APPROVED;
        loadRequest.reviewedBy = adminId;
        loadRequest.reviewedAt = new Date();
        loadRequest.adminRemark = adminRemark;
        await loadRequestRepository.save(loadRequest);
        const transaction = transactionRepository.create({
            walletId: wallet.id,
            userId: loadRequest.userId,
            type: WalletTransaction_entity_1.TransactionType.CREDIT,
            source: WalletTransaction_entity_1.TransactionSource.WALLET_LOAD,
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
    }
    catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    }
    finally {
        await queryRunner.release();
    }
};
exports.approveWalletLoadRequest = approveWalletLoadRequest;
const rejectWalletLoadRequest = async (loadRequestId, adminId, rejectionReason, adminRemark) => {
    const queryRunner = database_1.default.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const loadRequestRepository = queryRunner.manager.getRepository(WalletLoadRequest_entity_1.WalletLoadRequest);
        const loadRequest = await loadRequestRepository.findOne({
            where: { id: loadRequestId },
        });
        if (!loadRequest) {
            throw new Error('Load request not found');
        }
        if (loadRequest.status !== WalletLoadRequest_entity_1.LoadRequestStatus.PENDING) {
            throw new Error('Load request is not pending');
        }
        loadRequest.status = WalletLoadRequest_entity_1.LoadRequestStatus.REJECTED;
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
    }
    catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    }
    finally {
        await queryRunner.release();
    }
};
exports.rejectWalletLoadRequest = rejectWalletLoadRequest;
