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
exports.getBonus = exports.withdraw = exports.getWalletLoadRequests = exports.requestWalletLoad = exports.getTransactions = exports.getBalance = void 0;
const database_1 = __importDefault(require("@/config/database"));
const Wallet_entity_1 = require("@/models/Wallet.entity");
const WalletTransaction_entity_1 = require("@/models/WalletTransaction.entity");
const response_1 = require("@/utils/response");
const walletService = __importStar(require("./wallet.service"));
const WalletLoadRequest_entity_1 = require("@/models/WalletLoadRequest.entity");
const getBalance = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const walletRepository = database_1.default.getRepository(Wallet_entity_1.Wallet);
        const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
        if (!wallet) {
            (0, response_1.errorResponse)(ctx, 'Wallet not found', 404);
            return;
        }
        const points = parseFloat(wallet.balance.toString());
        (0, response_1.successResponse)(ctx, {
            balance: parseFloat(wallet.balance.toString()),
            bonusBalance: parseFloat(wallet.bonusBalance.toString()),
            lockedAmount: parseFloat(wallet.lockedAmount.toString()),
            availableBalance: parseFloat(wallet.balance.toString()) - parseFloat(wallet.lockedAmount.toString()),
            points,
            currency: wallet.currency,
        }, 'Balance retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get balance', 500);
    }
};
exports.getBalance = getBalance;
const getTransactions = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { page = 1, limit = 20 } = ctx.query;
        const skip = (Number(page) - 1) * Number(limit);
        const transactionRepository = database_1.default.getRepository(WalletTransaction_entity_1.WalletTransaction);
        const [transactions, total] = await transactionRepository.findAndCount({
            where: { userId: ctx.user.id },
            order: { createdAt: 'DESC' },
            skip,
            take: Number(limit),
        });
        (0, response_1.successResponse)(ctx, {
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
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get transactions', 500);
    }
};
exports.getTransactions = getTransactions;
const requestWalletLoad = async (ctx) => {
    const proofImage = ctx.state.file; // This comes from our middleware
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { amount, paymentMethod, transactionReference, userNote } = ctx.state.validated;
        const walletRepository = database_1.default.getRepository(Wallet_entity_1.Wallet);
        let wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
        if (!wallet) {
            wallet = walletRepository.create({ userId: ctx.user.id });
            await walletRepository.save(wallet);
        }
        // Handle file upload
        let proofImagePath = '';
        if (proofImage) {
            const { saveFile } = await Promise.resolve().then(() => __importStar(require('@/utils/fileUpload')));
            // Cast to Express.Multer.File since it comes from multer middleware
            proofImagePath = saveFile(proofImage, 'wallet-load-proofs');
        }
        else if (paymentMethod === WalletLoadRequest_entity_1.PaymentMethod.BANK_TRANSFER) {
            throw new Error('Proof image is required for bank transfer');
        }
        const result = await walletService.requestWalletLoad(ctx.user.id, wallet.id, amount, transactionReference, userNote, proofImagePath);
        (0, response_1.successResponse)(ctx, result, 'Wallet load request submitted successfully');
    }
    catch (error) {
        // Clean up uploaded file if there was an error
        if (proofImage && proofImage.path) {
            const { deleteFile } = await Promise.resolve().then(() => __importStar(require('@/utils/fileUpload')));
            deleteFile(proofImage.path);
        }
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to request wallet load', error.status || 500);
    }
};
exports.requestWalletLoad = requestWalletLoad;
const getWalletLoadRequests = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { page = 1, limit = 20 } = ctx.query;
        const result = await walletService.getWalletLoadRequests(ctx.user.id, Number(page), Number(limit));
        (0, response_1.successResponse)(ctx, result, 'Load requests retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get load requests', 500);
    }
};
exports.getWalletLoadRequests = getWalletLoadRequests;
const withdraw = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { amount, bankDetails, upiId } = ctx.state.validated;
        const walletRepository = database_1.default.getRepository(Wallet_entity_1.Wallet);
        const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
        if (!wallet) {
            (0, response_1.errorResponse)(ctx, 'Wallet not found', 404);
            return;
        }
        const result = await walletService.requestWithdrawal(ctx.user.id, wallet.id, amount, bankDetails, upiId);
        (0, response_1.successResponse)(ctx, result, 'Withdrawal request submitted successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to request withdrawal', 500);
    }
};
exports.withdraw = withdraw;
const getBonus = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const walletRepository = database_1.default.getRepository(Wallet_entity_1.Wallet);
        const wallet = await walletRepository.findOne({ where: { userId: ctx.user.id } });
        if (!wallet) {
            (0, response_1.errorResponse)(ctx, 'Wallet not found', 404);
            return;
        }
        (0, response_1.successResponse)(ctx, {
            bonusBalance: parseFloat(wallet.bonusBalance.toString()),
        }, 'Bonus balance retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get bonus', 500);
    }
};
exports.getBonus = getBonus;
