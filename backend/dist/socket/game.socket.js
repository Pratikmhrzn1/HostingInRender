"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("@/config/logger"));
const gameHandler_1 = require("../../socket/gameHandler");
const database_1 = __importDefault(require("@/config/database"));
const User_entity_1 = require("@/models/User.entity");
const JWT_SECRET = process.env.JWT_SECRET || 'ludo-jwt-secret-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (isProduction ? null : 'http://localhost:5173');
const socketCorsOptions = CLIENT_URL
    ? { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true }
    : { origin: true, methods: ['GET', 'POST'], credentials: true };
function respondWithUser(user) {
    if (!user)
        return null;
    const balance = user.wallet?.balance ? parseFloat(user.wallet.balance.toString()) : 0;
    const bonusBalance = user.wallet?.bonusBalance ? parseFloat(user.wallet.bonusBalance.toString()) : 0;
    const lockedAmount = user.wallet?.lockedAmount ? parseFloat(user.wallet.lockedAmount.toString()) : 0;
    return {
        id: user.id,
        username: user.username,
        email: user.email || null,
        name: user.name || user.username,
        phone: user.phone || null,
        avatar: user.avatar || null,
        isVerified: Boolean(user.is_verified || user.isVerified),
        role: user.role || 'USER',
        status: user.status || 'ACTIVE',
        points: balance,
        bonusBalance,
        lockedAmount,
    };
}
function verifyJWT(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
function getTokenFromSocket(socket) {
    const authToken = socket.handshake.auth?.token;
    const queryToken = socket.handshake.query?.token;
    return ((typeof authToken === 'string' && authToken.trim().length ? authToken : null) ||
        (typeof queryToken === 'string' && queryToken.trim().length ? queryToken : null) ||
        null);
}
class GameSocket {
    constructor(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: socketCorsOptions,
            pingTimeout: 30000,
            pingInterval: 10000,
            transports: ['websocket', 'polling'],
        });
        this.io.use((socket, next) => this.authenticateSocket(socket, next));
        this.io.on('connection', (socket) => {
            logger_1.default.info(`Socket connected: ${socket.id}`);
            (0, gameHandler_1.gameHandler)(this.io, socket);
        });
    }
    async authenticateSocket(socket, next) {
        const token = getTokenFromSocket(socket);
        if (token) {
            const decoded = verifyJWT(token);
            if (decoded && decoded.userId) {
                const user = await database_1.default.getRepository(User_entity_1.User).findOne({
                    where: { id: decoded.userId },
                    relations: ['wallet'],
                });
                if (user) {
                    socket.user = respondWithUser(user);
                }
            }
        }
        next();
    }
    getIO() {
        return this.io;
    }
}
exports.GameSocket = GameSocket;
