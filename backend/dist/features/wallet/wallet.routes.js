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
const walletController = __importStar(require("./wallet.controller"));
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const response_1 = require("@/utils/response");
const WalletLoadRequest_entity_1 = require("@/models/WalletLoadRequest.entity");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fileUpload_1 = require("@/utils/fileUpload");
const router = new router_1.default();
// Configure multer for file uploads
(0, fileUpload_1.createUploadsDir)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fileUpload_1.UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    },
});
// File schema for proof image
const fileSchema = zod_1.z.object({
    fieldname: zod_1.z.string(),
    originalname: zod_1.z.string(),
    encoding: zod_1.z.string(),
    mimetype: zod_1.z.string().regex(/^image\/(jpeg|png|jpg|gif)$/, 'Only image files are allowed'),
    buffer: zod_1.z.any(),
    size: zod_1.z.number().max(5 * 1024 * 1024, 'File size should be less than 5MB')
});
const requestWalletLoadSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be positive'),
    paymentMethod: zod_1.z.nativeEnum(WalletLoadRequest_entity_1.PaymentMethod),
    transactionReference: zod_1.z.string().optional(),
    userNote: zod_1.z.string().optional(),
    proofImage: fileSchema.optional(), // File validation will be handled by multer
});
const withdrawSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be positive'),
    bankDetails: zod_1.z.object({
        accountNumber: zod_1.z.string().min(1, 'Account number is required'),
        accountName: zod_1.z.string().min(1, 'Account name is required'),
        bankName: zod_1.z.string().min(1, 'Bank name is required'),
        branch: zod_1.z.string().optional(),
        swiftCode: zod_1.z.string().optional()
    })
});
/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankDetails
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 description: Amount to withdraw (must be positive)
 *               bankDetails:
 *                 type: object
 *                 required:
 *                   - accountNumber
 *                   - accountName
 *                   - bankName
 *                 properties:
 *                   accountNumber:
 *                     type: string
 *                   accountName:
 *                     type: string
 *                   bankName:
 *                     type: string
 *                   branch:
 *                     type: string
 *                   swiftCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Withdrawal request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/withdraw', auth_1.authenticate, (0, validation_1.validate)(withdrawSchema, 'body'), walletController.withdraw);
/**
 * @swagger
 * /api/wallet/request-load:
 *   post:
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [BANK_TRANSFER, CARD, MOBILE_MONEY,EWALLET,OTHER]
 *               transactionReference:
 *                 type: string
 *               userNote:
 *                 type: string
 *               proofImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Wallet load request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// Type-safe file upload middleware
const handleFileUpload = (fieldName) => {
    return async (ctx, next) => {
        // First parse the form data
        await new Promise((resolve, reject) => {
            // Initialize multer upload
            upload.single(fieldName)(ctx.req, ctx.res, async (err) => {
                if (err) {
                    // Handle file validation errors
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        (0, response_1.errorResponse)(ctx, 'File size should be less than 5MB', 400);
                        return resolve();
                    }
                    else if (err.message.includes('image files')) {
                        (0, response_1.errorResponse)(ctx, 'Only image files are allowed (jpeg, jpg, png, gif)', 400);
                        return resolve();
                    }
                    reject(err);
                    return;
                }
                try {
                    // Get form fields from the request
                    const body = ctx.req.body || {};
                    const file = ctx.req.file;
                    // Convert amount to number if it exists
                    if (body.amount) {
                        body.amount = parseFloat(body.amount);
                    }
                    // Ensure paymentMethod is in the correct case
                    if (body.paymentMethod) {
                        body.paymentMethod = body.paymentMethod.toLowerCase();
                    }
                    // Check if file is required for bank transfer
                    if (body.paymentMethod === WalletLoadRequest_entity_1.PaymentMethod.BANK_TRANSFER && !file) {
                        (0, response_1.errorResponse)(ctx, 'Proof image is required for bank transfer', 400);
                        return resolve();
                    }
                    // Attach file to state for the controller to access
                    ctx.state = ctx.state || {};
                    ctx.state.file = file;
                    // Attach parsed body to Koa context
                    ctx.request.body = body;
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        // Only proceed to next middleware if headers haven't been sent yet
        if (!ctx.headerSent) {
            await next();
        }
    };
};
router.post('/request-load', auth_1.authenticate, handleFileUpload('proofImage'), (0, validation_1.validate)(requestWalletLoadSchema, 'body'), walletController.requestWalletLoad);
/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/balance', auth_1.authenticate, walletController.getBalance);
/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     tags: [Wallet]
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/transactions', auth_1.authenticate, walletController.getTransactions);
/**
 * @swagger
 * /api/wallet/bonus:
 *   get:
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bonus information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalBonus:
 *                           type: number
 *                         availableBonus:
 *                           type: number
 *                         bonusHistory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               amount:
 *                                 type: number
 *                               reason:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 */
router.get('/bonus', auth_1.authenticate, walletController.getBonus);
exports.default = router;
