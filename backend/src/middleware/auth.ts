import { Next } from 'koa';
import jwt from 'jsonwebtoken';
import { errorResponse } from '@/utils/response';
import { CustomContext, JwtPayload } from '@/types';
import { redisClient } from '@/config/redis';

const JWT_SECRET = process.env.JWT_SECRET || '';

export const authenticate = async (ctx: CustomContext, next: Next): Promise<void> => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      errorResponse(ctx, 'Authentication token required', 401);
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Check if token is blacklisted
    const tokenKey = `blacklist:${decoded.userId}`;
    const isBlacklisted = await redisClient.get(tokenKey);
    
    if (isBlacklisted) {
      errorResponse(ctx, 'Token has been invalidated. Please login again', 401);
      return;
    }
    
    ctx.user = {
      id: decoded.userId,
      phone: decoded.phone,
      email: decoded.email,
      role: decoded.role,
    };

    await next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      errorResponse(ctx, 'Invalid token', 401);
    } else if (error.name === 'TokenExpiredError') {
      errorResponse(ctx, 'Token expired', 401);
    } else {
      errorResponse(ctx, 'Authentication failed', 401);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return async (ctx: CustomContext, next: Next): Promise<void> => {
    if (!ctx.user) {
      errorResponse(ctx, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(ctx.user.role || '')) {
      errorResponse(ctx, 'Insufficient permissions', 403);
      return;
    }

    await next();
  };
};

