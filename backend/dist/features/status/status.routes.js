"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("@koa/router"));
const status_controller_1 = __importDefault(require("./status.controller"));
const router = new router_1.default();
/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get system status
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Status retrieved successfully
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
 *                         uptime:
 *                           type: number
 *                         database:
 *                           type: string
 *                         redis:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 */
router.get('/', status_controller_1.default.getStatus);
exports.default = router;
