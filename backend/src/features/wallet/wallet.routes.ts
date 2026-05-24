import Router from '@koa/router';
import { z } from 'zod';
import * as walletController from './wallet.controller';
import { validate } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';
import { errorResponse } from '@/utils/response';
import { PaymentMethod } from '@/models/WalletLoadRequest.entity';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUploadsDir, UPLOADS_DIR } from '@/utils/fileUpload';

const router = new Router();

// Configure multer for file uploads
createUploadsDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  },
});

// File schema for proof image
const fileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().regex(/^image\/(jpeg|png|jpg|gif)$/, 'Only image files are allowed'),
  buffer: z.any(),
  size: z.number().max(5 * 1024 * 1024, 'File size should be less than 5MB')
});
const requestWalletLoadSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().optional(),
  userNote: z.string().optional(),
  proofImage: fileSchema.optional(), // File validation will be handled by multer
});

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  bankDetails: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    accountName: z.string().min(1, 'Account name is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    branch: z.string().optional(),
    swiftCode: z.string().optional()
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
router.post('/withdraw',
  authenticate,
  validate(withdrawSchema, 'body'),
  walletController.withdraw
);

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
const handleFileUpload = (fieldName: string) => {
  return async (ctx: any, next: () => Promise<any>) => {
    // First parse the form data
    await new Promise<void>((resolve, reject) => {
      // Initialize multer upload
      upload.single(fieldName)(ctx.req, ctx.res, async (err: any) => {
        if (err) {
          // Handle file validation errors
          if (err.code === 'LIMIT_FILE_SIZE') {
            errorResponse(ctx, 'File size should be less than 5MB', 400);
            return resolve();
          } else if (err.message.includes('image files')) {
            errorResponse(ctx, 'Only image files are allowed (jpeg, jpg, png, gif)', 400);
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
          if (body.paymentMethod === PaymentMethod.BANK_TRANSFER && !file) {
            errorResponse(ctx, 'Proof image is required for bank transfer', 400);
            return resolve();
          }
          
          // Attach file to state for the controller to access
          ctx.state = ctx.state || {};
          ctx.state.file = file;
          
          // Attach parsed body to Koa context
          ctx.request.body = body;
          
          resolve();
        } catch (error) {
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

router.post('/request-load',
  authenticate,
  handleFileUpload('proofImage'),
  validate(requestWalletLoadSchema, 'body'),
  walletController.requestWalletLoad
);

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
router.get('/balance', authenticate, walletController.getBalance);

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
router.get('/transactions', authenticate, walletController.getTransactions);

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
router.get('/bonus', authenticate, walletController.getBonus);

export default router;
