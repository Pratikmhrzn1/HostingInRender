import Router from '@koa/router';
import { z } from 'zod';
import * as gamesController from './games.controller';
import { validate } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';

const router = new Router();

const joinTableSchema = z.object({
  tableId: z.string(),
});

const leaveTableSchema = z.object({
  tableId: z.string(),
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
router.post('/join-table', authenticate, validate(joinTableSchema), gamesController.joinTable);

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
router.post('/leave-table', authenticate, validate(leaveTableSchema), gamesController.leaveTable);

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
router.get('/history', authenticate, gamesController.getGameHistory);

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

export default router;
