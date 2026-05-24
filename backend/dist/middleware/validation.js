"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const response_1 = require("@/utils/response");
const validate = (schema, source) => {
    return async (ctx, next) => {
        try {
            const body = ctx.request.body;
            const query = ctx.query;
            const params = ctx.params;
            let data;
            if (source === 'body') {
                data = body;
            }
            else if (source === 'query') {
                data = query;
            }
            else if (source === 'params') {
                data = params;
            }
            else {
                data = { ...body, ...query, ...params };
            }
            const validated = await schema.parseAsync(data);
            ctx.state.validated = validated;
            await next();
        }
        catch (error) {
            if (error.errors) {
                (0, response_1.validationErrorResponse)(ctx, error.errors);
            }
            else {
                (0, response_1.validationErrorResponse)(ctx, [{ message: error.message }]);
            }
        }
    };
};
exports.validate = validate;
