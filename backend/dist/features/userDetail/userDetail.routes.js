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
const koa_body_1 = __importDefault(require("koa-body"));
const userDetailController = __importStar(require("./userDetail.controller"));
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const fileUpload_1 = require("@/utils/fileUpload");
const types_1 = require("@/types");
const router = new router_1.default();
const statusEnum = zod_1.z.nativeEnum(types_1.UserDetailStatus);
// Validation schemas for multipart form data
const createUserDetailSchema = zod_1.z.object({
    'idDocument[number]': zod_1.z.string().min(1, 'ID document number is required'),
    status: statusEnum.optional().default(types_1.UserDetailStatus.PENDING),
}).passthrough();
const updateUserDetailSchema = zod_1.z.object({
    idDocument: zod_1.z.object({
        number: zod_1.z.string().min(1, 'ID document number is required').optional(),
    }).optional(),
    status: statusEnum.optional().default(types_1.UserDetailStatus.PENDING),
});
const verifyUserDetailSchema = zod_1.z.object({
    status: statusEnum,
    rejectionReason: zod_1.z.string().optional(),
});
const querySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/, 'Page must be a number').optional().default('1'),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a number').optional().default('10'),
    sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    status: statusEnum.optional(),
    search: zod_1.z.string().optional(),
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
const uploadMiddleware = (0, koa_body_1.default)({
    multipart: true,
    formidable: {
        uploadDir: fileUpload_1.UPLOADS_DIR,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        multiples: true
    },
    onError: (err, ctx) => {
        ctx.throw(400, `File upload error: ${err.message}`);
    }
});
// Handle file uploads with validation
router.post('/', auth_1.authenticate, uploadMiddleware, // koa-body type compatibility
(0, validation_1.validate)(createUserDetailSchema, 'body'), userDetailController.createUserDetail);
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
router.get('/', auth_1.authenticate, userDetailController.getUserDetail);
router.put('/', auth_1.authenticate, uploadMiddleware, (0, validation_1.validate)(updateUserDetailSchema, 'body'), userDetailController.updateUserDetail);
router.delete('/', auth_1.authenticate, userDetailController.deleteUserDetail);
// Admin routes
router.get('/all', auth_1.authenticate, (0, validation_1.validate)(querySchema, 'query'), userDetailController.getAllUserDetails);
router.patch('/:userId/verify', auth_1.authenticate, (0, validation_1.validate)(verifyUserDetailSchema), userDetailController.verifyUserDetail);
exports.default = router;
