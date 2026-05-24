"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = exports.koaSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const koa2_swagger_ui_1 = require("koa2-swagger-ui");
Object.defineProperty(exports, "koaSwagger", { enumerable: true, get: function () { return koa2_swagger_ui_1.koaSwagger; } });
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Game Platform Backend API',
        version: '1.0.0',
        description: 'Real-money multi-game platform backend API',
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 3000}`,
            description: 'Development server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false,
                    },
                    message: {
                        type: 'string',
                    },
                    statusCode: {
                        type: 'integer',
                    },
                },
            },
            Success: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true,
                    },
                    data: {
                        type: 'object',
                    },
                    message: {
                        type: 'string',
                    },
                },
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    tags: [
        {
            name: 'Authentication',
            description: 'Authentication endpoints',
        },
        {
            name: 'Wallet',
            description: 'Wallet management endpoints',
        },
        {
            name: 'Games',
            description: 'Game related endpoints',
        },
        {
            name: 'Admin',
            description: 'Admin endpoints',
        },
        {
            name: 'Status',
            description: 'Status endpoints',
        },
    ],
};
const options = {
    swaggerDefinition,
    apis: ['./src/features/**/*.routes.ts', './src/features/**/*.controller.ts'], // paths to files containing OpenAPI definitions
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.swaggerSpec = swaggerSpec;
