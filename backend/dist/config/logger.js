"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const logLevel = process.env.LOG_LEVEL || 'info';
const logFilePath = process.env.LOG_FILE_PATH || './logs';
const logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'game-platform-backend' },
    transports: [
        new winston_1.default.transports.File({
            filename: `${logFilePath}/error.log`,
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: `${logFilePath}/combined.log`
        }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
exports.default = logger;
