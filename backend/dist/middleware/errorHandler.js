"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("@/config/logger"));
const response_1 = require("@/utils/response");
const errorHandler = async (ctx, next) => {
    try {
        await next();
    }
    catch (err) {
        logger_1.default.error('Error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal server error';
        const error = process.env.NODE_ENV === 'development' ? err.stack : undefined;
        (0, response_1.errorResponse)(ctx, message, status, error);
    }
};
exports.errorHandler = errorHandler;
