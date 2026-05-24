"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("@/utils/response");
const redis_1 = require("@/config/redis");
const JWT_SECRET = process.env.JWT_SECRET || '';
const authenticate = async (ctx, next) => {
    try {
        const token = ctx.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            (0, response_1.errorResponse)(ctx, 'Authentication token required', 401);
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if token is blacklisted
        const tokenKey = `blacklist:${decoded.userId}`;
        const isBlacklisted = await redis_1.redisClient.get(tokenKey);
        if (isBlacklisted) {
            (0, response_1.errorResponse)(ctx, 'Token has been invalidated. Please login again', 401);
            return;
        }
        ctx.user = {
            id: decoded.userId,
            phone: decoded.phone,
            email: decoded.email,
            role: decoded.role,
        };
        await next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            (0, response_1.errorResponse)(ctx, 'Invalid token', 401);
        }
        else if (error.name === 'TokenExpiredError') {
            (0, response_1.errorResponse)(ctx, 'Token expired', 401);
        }
        else {
            (0, response_1.errorResponse)(ctx, 'Authentication failed', 401);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return async (ctx, next) => {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'Authentication required', 401);
            return;
        }
        if (!roles.includes(ctx.user.role || '')) {
            (0, response_1.errorResponse)(ctx, 'Insufficient permissions', 403);
            return;
        }
        await next();
    };
};
exports.authorize = authorize;
