import { Context, Next } from 'koa';
import { ZodSchema } from 'zod';
import { validationErrorResponse } from '@/utils/response';

interface RequestBody {
  [key: string]: any;
}

export const validate = (schema: ZodSchema, source?: 'body' | 'query' | 'params') => {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      const body = (ctx.request as any).body as RequestBody | undefined;
      const query = ctx.query;
      const params = ctx.params;

      let data: any;
      if (source === 'body') {
        data = body;
      } else if (source === 'query') {
        data = query;
      } else if (source === 'params') {
        data = params;
      } else {
        data = { ...body, ...query, ...params };
      }

      const validated = await schema.parseAsync(data);
      
      ctx.state.validated = validated;
      await next();
    } catch (error: any) {
      if (error.errors) {
        validationErrorResponse(ctx, error.errors);
      } else {
        validationErrorResponse(ctx, [{ message: error.message }]);
      }
    }
  };
};

