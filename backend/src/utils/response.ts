import { Context } from 'koa';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const successResponse = <T>(
  ctx: Context,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  ctx.status = statusCode;
  ctx.body = {
    success: true,
    message,
    data,
  } as ApiResponse<T>;
};

export const errorResponse = (
  ctx: Context,
  message: string,
  statusCode: number = 400,
  error?: string
): void => {
  ctx.status = statusCode;
  ctx.body = {
    success: false,
    message,
    error,
  } as ApiResponse;
};

export const validationErrorResponse = (
  ctx: Context,
  errors: any[]
): void => {
  ctx.status = 400;
  ctx.body = {
    success: false,
    message: 'Validation failed',
    errors,
  };
};

