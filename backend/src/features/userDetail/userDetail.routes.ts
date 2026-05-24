import Router from '@koa/router';
import { z } from 'zod';
import koaBody from 'koa-body';
import * as userDetailController from './userDetail.controller';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { UPLOADS_DIR } from '@/utils/fileUpload';
import { UserDetailStatus } from '@/types';

const router = new Router();

const statusEnum = z.nativeEnum(UserDetailStatus);

// Validation schemas for multipart form data
const createUserDetailSchema = z.object({
  'idDocument[number]': z.string().min(1, 'ID document number is required'),
  status: statusEnum.optional().default(UserDetailStatus.PENDING),
}).passthrough();

const updateUserDetailSchema = z.object({
  idDocument: z.object({
    number: z.string().min(1, 'ID document number is required').optional(),
  }).optional(),
  status: statusEnum.optional().default(UserDetailStatus.PENDING),
});

const verifyUserDetailSchema = z.object({
  status: statusEnum,
  rejectionReason: z.string().optional(),
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().default('10'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: statusEnum.optional(),
  search: z.string().optional(),
});

/**
 * @swagger
 * /api/userDetail:
 *   post:
 *     summary: Create user details for verification
 *     tags: [UserDetail]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: object
 *                 properties:
 *                   idDocument:
 *                     type: object
 *                     properties:
 *                       front:
 *                         type: string
 *                         format: uri
 *                       back:
 *                         type: string
 *                         format: uri
 *                       number:
 *                         type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING]
 *                 default: PENDING
 *     responses:
 *       200:
 *         description: User details created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// Configure file upload middleware
const uploadMiddleware = koaBody({
  multipart: true,
  formidable: {
    uploadDir: UPLOADS_DIR,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    multiples: true
  },
  onError: (err, ctx) => {
    ctx.throw(400, `File upload error: ${err.message}`);
  }
});

// Handle file uploads with validation
router.post(
  '/', 
  authenticate, 
  uploadMiddleware as any, // koa-body type compatibility
  validate(createUserDetailSchema, 'body'),
  userDetailController.createUserDetail
);

/**
 * @swagger
 * /api/userDetail:
 * @swagger
 * /api/userDetail:
 *   get:
 *     summary: Get user details
 *     tags: [UserDetail]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                         id:
 *                           type: string
 *                         documents:
 *                           type: object
 *                         status:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 */
router.get('/', authenticate, userDetailController.getUserDetail);
router.put('/', authenticate, uploadMiddleware as any, validate(updateUserDetailSchema, 'body'), userDetailController.updateUserDetail);
router.delete('/', authenticate, userDetailController.deleteUserDetail);

// Admin routes
router.get('/all', authenticate, validate(querySchema, 'query'), userDetailController.getAllUserDetails);
router.patch('/:userId/verify', authenticate, validate(verifyUserDetailSchema), userDetailController.verifyUserDetail);

export default router;
