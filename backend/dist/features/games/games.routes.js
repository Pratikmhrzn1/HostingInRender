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
const gamesController = __importStar(require("./games.controller"));
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = new router_1.default();
const joinTableSchema = zod_1.z.object({
    tableId: zod_1.z.string(),
});
const leaveTableSchema = zod_1.z.object({
    tableId: zod_1.z.string(),
});
/**
 * @swagger
 * /api/games/list:
 *   get:
 *     summary: Get list of available games
 *     tags: [Games]
 *     responses:
 *       200:
 *         description: Games list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           minBet:
 *                             type: number
 *                           maxBet:
 *                             type: number
 *                           status:
 *                             type: string
 */
router.get('/list', gamesController.getGameList);
/**
 * @swagger
 * /api/games/join-table:
 *   post:
 *     summary: Join a game table
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *             properties:
 *               tableId:
 *                 type: string
 *                 example: "table-123"
 *     responses:
 *       200:
 *         description: Joined table successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/join-table', auth_1.authenticate, (0, validation_1.validate)(joinTableSchema), gamesController.joinTable);
/**
 * @swagger
 * /api/games/leave-table:
 *   post:
 *     summary: Leave a game table
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *             properties:
 *               tableId:
 *                 type: string
 *                 example: "table-123"
 *     responses:
 *       200:
 *         description: Left table successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/leave-table', auth_1.authenticate, (0, validation_1.validate)(leaveTableSchema), gamesController.leaveTable);
/**
 * @swagger
 * /api/games/history:
 *   get:
 *     summary: Get user's game history
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Game history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           gameId:
 *                             type: string
 *                           result:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/history', auth_1.authenticate, gamesController.getGameHistory);
/**
 * @swagger
 * /api/games/live:
 *   get:
 *     summary: Get live games information
 *     tags: [Games]
 *     responses:
 *       200:
 *         description: Live games retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           playersCount:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           currentPot:
 *                             type: number
 */
router.get('/live', gamesController.getLiveGames);
exports.default = router;
