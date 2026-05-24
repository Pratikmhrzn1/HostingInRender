import { Context, Next } from 'koa';
import logger from '@/config/logger';
import { errorResponse } from '@/utils/response';

export const errorHandler = async (ctx: Context, next: Next): Promise<void> => {
  try {
    await next();
  } catch (err: any) {
    logger.error('Error:', err);

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const error = process.env.NODE_ENV === 'development' ? err.stack : undefined;

    errorResponse(ctx, message, status, error);
  }
};

