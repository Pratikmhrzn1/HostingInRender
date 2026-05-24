
import Router from '@koa/router';
import StatusController from './status.controller';

const router = new Router();

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
router.get('/', StatusController.getStatus);

export default router;
