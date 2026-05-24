"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("tsconfig-paths/register");
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const koa_1 = __importDefault(require("koa"));
const router_1 = __importDefault(require("@koa/router"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const cors_1 = __importDefault(require("@koa/cors"));
const koa_helmet_1 = __importDefault(require("koa-helmet"));
const koa_json_1 = __importDefault(require("koa-json"));
const koa_logger_1 = __importDefault(require("koa-logger"));
const koa_static_1 = __importDefault(require("koa-static"));
const postgres_1 = __importDefault(require("postgres"));
const dotenv_1 = require("dotenv");
const swagger_1 = require("@/config/swagger");
const errorHandler_1 = require("@/middleware/errorHandler");
const auth_routes_1 = __importDefault(require("@/features/auth/auth.routes"));
const wallet_routes_1 = __importDefault(require("@/features/wallet/wallet.routes"));
const games_routes_1 = __importDefault(require("@/features/games/games.routes"));
const admin_routes_1 = __importDefault(require("@/features/admin/admin.routes"));
const status_routes_1 = __importDefault(require("@/features/status/status.routes"));
const userDetail_routes_1 = __importDefault(require("@/features/userDetail/userDetail.routes"));
const database_1 = __importDefault(require("./config/database"));
const redis_1 = require("./config/redis");
const game_socket_1 = require("./socket/game.socket");
const logger_1 = __importDefault(require("./config/logger"));
(0, dotenv_1.config)();
const app = new koa_1.default();
const router = new router_1.default();
const API_PREFIX = process.env.API_PREFIX || '/api';
const sql = (0, postgres_1.default)(process.env.DATABASE_URL);
const swaggerRoutePrefix = '/api-docs';
app.use(errorHandler_1.errorHandler);
app.use((0, koa_helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            scriptSrcElem: ["'self'", 'https://cdnjs.cloudflare.com', "'sha256-pFMFd54tBaUIdnM4TsRn3wZb3UGLC/JYQ8/wq0fd81w='"],
        },
    },
}));
app.use((0, cors_1.default)());
app.use((0, koa_json_1.default)());
app.use((0, koa_logger_1.default)());
app.use((0, koa_bodyparser_1.default)());
app.use((0, koa_static_1.default)('public'));
const frontendDistDir = path_1.default.resolve(__dirname, '../frontend-dist');
const frontendIndexPath = path_1.default.join(frontendDistDir, 'index.html');
const hasFrontendDist = (0, fs_1.existsSync)(frontendDistDir);
if (hasFrontendDist) {
    app.use((0, koa_static_1.default)(frontendDistDir, { index: false }));
}
else {
    logger_1.default.warn('Frontend dist folder is missing; SPA routes will return 503 until it is built.');
}
router.get('/health', (ctx) => {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});
router.get('/health/db', async (ctx) => {
    try {
        await sql `select 1`;
        ctx.body = { db: 'connected' };
    }
    catch (err) {
        ctx.status = 500;
        ctx.body = { db: 'not connected', error: err.message };
    }
});
router.get('/swagger.json', (ctx) => {
    ctx.body = swagger_1.swaggerSpec;
});
router.use('/status', status_routes_1.default.routes(), status_routes_1.default.allowedMethods());
router.use(`${API_PREFIX}/userDetail`, userDetail_routes_1.default.routes(), userDetail_routes_1.default.allowedMethods());
router.use(`${API_PREFIX}/wallet`, wallet_routes_1.default.routes(), wallet_routes_1.default.allowedMethods());
router.use(`${API_PREFIX}/auth`, auth_routes_1.default.routes(), auth_routes_1.default.allowedMethods());
router.use(`${API_PREFIX}/games`, games_routes_1.default.routes(), games_routes_1.default.allowedMethods());
router.use(`${API_PREFIX}/admin`, admin_routes_1.default.routes(), admin_routes_1.default.allowedMethods());
const shouldExcludeFromSpa = (requestPath) => {
    const normalized = requestPath.toLowerCase();
    return (normalized === '/health' ||
        normalized === '/health/db' ||
        normalized === '/swagger.json' ||
        normalized.startsWith(API_PREFIX) ||
        normalized.startsWith(swaggerRoutePrefix) ||
        normalized.startsWith('/status') ||
        normalized.startsWith('/socket.io'));
};
router.get('(.*)', (ctx) => {
    if (ctx.method !== 'GET' || shouldExcludeFromSpa(ctx.path)) {
        return;
    }
    if (!(0, fs_1.existsSync)(frontendIndexPath)) {
        ctx.status = 503;
        ctx.body = { error: 'Frontend build not found. Run the React build before starting the server.' };
        return;
    }
    ctx.type = 'html';
    ctx.body = (0, fs_1.createReadStream)(frontendIndexPath);
});
app.use(router.routes()).use(router.allowedMethods());
app.use((0, swagger_1.koaSwagger)({
    routePrefix: swaggerRoutePrefix,
    swaggerOptions: { url: '/swagger.json' },
}));
const PORT = parseInt(process.env.PORT || '3000', 10);
async function startServer() {
    try {
        await database_1.default.initialize();
        logger_1.default.info('✅ Database connected successfully');
        if (redis_1.isRedisEnabled) {
            await redis_1.redisClient.connect();
            await redis_1.redisClient.ping();
            logger_1.default.info('✅ Redis connected successfully');
        }
        else {
            logger_1.default.info('⚠️ Redis connection skipped (disabled)');
        }
        const httpServer = http_1.default.createServer(app.callback());
        new game_socket_1.GameSocket(httpServer);
        logger_1.default.info('✅ Socket.IO initialized');
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger_1.default.info(`🚀 Server running on port ${PORT}`);
            logger_1.default.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        // ✅ Proper error logging — shows exact crash reason
        console.error('❌ Server failed to start');
        console.error('Message:', error?.message);
        console.error('Stack:', error?.stack);
        logger_1.default.error('❌ Server failed to start', {
            message: error?.message,
            stack: error?.stack,
        });
        process.exit(1);
    }
}
startServer();
exports.default = app;
