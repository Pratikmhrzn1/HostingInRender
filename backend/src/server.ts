import 'tsconfig-paths/register';
import http from 'http';
import path from 'path';
import { createReadStream, existsSync } from 'fs';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import json from 'koa-json';
import koaLogger from 'koa-logger';
import serve from 'koa-static';
import postgres from 'postgres';
import { config } from 'dotenv';
import { koaSwagger, swaggerSpec } from '@/config/swagger';
import { errorHandler } from '@/middleware/errorHandler';
import authRoutes from '@/features/auth/auth.routes';
import walletRoutes from '@/features/wallet/wallet.routes';
import gamesRoutes from '@/features/games/games.routes';
import adminRoutes from '@/features/admin/admin.routes';
import statusRoutes from '@/features/status/status.routes';
import userDetailRoutes from '@/features/userDetail/userDetail.routes';
import dataSource from './config/database';
import { redisClient, isRedisEnabled } from './config/redis';
import { GameSocket } from './socket/game.socket';
import logger from './config/logger';

config();

const app = new Koa();
const router = new Router();
const API_PREFIX = process.env.API_PREFIX || '/api';
const sql = postgres(process.env.DATABASE_URL!);

const swaggerRoutePrefix = '/api-docs';

app.use(errorHandler);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrcElem: ["'self'", 'https://cdnjs.cloudflare.com', "'sha256-pFMFd54tBaUIdnM4TsRn3wZb3UGLC/JYQ8/wq0fd81w='"],
      },
    },
  })
);
app.use(cors());
app.use(json());
app.use(koaLogger());
app.use(bodyParser());
app.use(serve('public'));

const frontendDistDir = path.resolve(__dirname, '../frontend-dist');
const frontendIndexPath = path.join(frontendDistDir, 'index.html');
const hasFrontendDist = existsSync(frontendDistDir);

if (hasFrontendDist) {
  app.use(serve(frontendDistDir, { index: false }));
} else {
  logger.warn('Frontend dist folder is missing; SPA routes will return 503 until it is built.');
}

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

router.get('/health/db', async (ctx) => {
  try {
    await sql`select 1`;
    ctx.body = { db: 'connected' };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { db: 'not connected', error: err.message };
  }
});

router.get('/swagger.json', (ctx) => {
  ctx.body = swaggerSpec;
});

router.use('/status', statusRoutes.routes(), statusRoutes.allowedMethods());
router.use(`${API_PREFIX}/userDetail`, userDetailRoutes.routes(), userDetailRoutes.allowedMethods());
router.use(`${API_PREFIX}/wallet`, walletRoutes.routes(), walletRoutes.allowedMethods());
router.use(`${API_PREFIX}/auth`, authRoutes.routes(), authRoutes.allowedMethods());
router.use(`${API_PREFIX}/games`, gamesRoutes.routes(), gamesRoutes.allowedMethods());
router.use(`${API_PREFIX}/admin`, adminRoutes.routes(), adminRoutes.allowedMethods());

const shouldExcludeFromSpa = (requestPath: string) => {
  const normalized = requestPath.toLowerCase();
  return (
    normalized === '/health' ||
    normalized === '/health/db' ||
    normalized === '/swagger.json' ||
    normalized.startsWith(API_PREFIX) ||
    normalized.startsWith(swaggerRoutePrefix) ||
    normalized.startsWith('/status') ||
    normalized.startsWith('/socket.io')
  );
};

router.get('(.*)', (ctx) => {
  if (ctx.method !== 'GET' || shouldExcludeFromSpa(ctx.path)) {
    return;
  }

  if (!existsSync(frontendIndexPath)) {
    ctx.status = 503;
    ctx.body = { error: 'Frontend build not found. Run the React build before starting the server.' };
    return;
  }

  ctx.type = 'html';
  ctx.body = createReadStream(frontendIndexPath);
});

app.use(router.routes()).use(router.allowedMethods());

app.use(
  koaSwagger({
    routePrefix: swaggerRoutePrefix,
    swaggerOptions: { url: '/swagger.json' },
  })
);

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  try {
    await dataSource.initialize();
    logger.info('✅ Database connected successfully');

    if (isRedisEnabled) {
      await redisClient!.connect();
      await redisClient!.ping();
      logger.info('✅ Redis connected successfully');
    } else {
      logger.info('⚠️ Redis connection skipped (disabled)');
    }

    const httpServer = http.createServer(app.callback());
    new GameSocket(httpServer);
    logger.info('✅ Socket.IO initialized');

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error: any) {
    // ✅ Proper error logging — shows exact crash reason
    console.error('❌ Server failed to start');
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
    logger.error('❌ Server failed to start', {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  }
}

startServer();

export default app;