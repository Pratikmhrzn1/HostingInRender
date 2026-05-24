"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationErrorResponse = exports.errorResponse = exports.successResponse = void 0;
const successResponse = (ctx, data, message = 'Success', statusCode = 200) => {
    ctx.status = statusCode;
    ctx.body = {
        success: true,
        message,
        data,
    };
};
exports.successResponse = successResponse;
const errorResponse = (ctx, message, statusCode = 400, error) => {
    ctx.status = statusCode;
    ctx.body = {
        success: false,
        message,
        error,
    };
};
exports.errorResponse = errorResponse;
const validationErrorResponse = (ctx, errors) => {
    ctx.status = 400;
    ctx.body = {
        success: false,
        message: 'Validation failed',
        errors,
    };
};
exports.validationErrorResponse = validationErrorResponse;
