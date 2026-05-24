import { Context } from 'koa';

export interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface CustomContext extends Context {
  user?: {
    id: string;
    phone?: string;
    email: string;
    role?: string;
  };
  state: {
    validated?: any;
    file?: File | File[];
  };
  request: Context['request'] & {
    files?: {
      [fieldname: string]: File[];
    };
    body: any;
  };
}

export interface JwtPayload {
  userId: string;
  phone?: string;
  email: string;
  role?: string;
}

export enum GameType {
  TEEN_PATTI = 'TEEN_PATTI',
  MARRIAGE = 'MARRIAGE',
  CHAAL_TEEN_PATTI = 'CHAAL_TEEN_PATTI',
  FARAS = 'FARAS',
  KITTI = 'KITTI',
  LUDO = 'LUDO',
  CALL_BREAK = 'CALL_BREAK',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionCategory {
  ADD_MONEY = 'ADD_MONEY',
  WITHDRAWAL = 'WITHDRAWAL',
  GAME_ENTRY = 'GAME_ENTRY',
  GAME_WIN = 'GAME_WIN',
  GAME_LOSS = 'GAME_LOSS',
  BONUS_CREDIT = 'BONUS_CREDIT',
  BONUS_DEBIT = 'BONUS_DEBIT',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  AGENT = 'AGENT',
}

export enum UserDetailStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  BETTING = 'BETTING',
  SHOWDOWN = 'SHOWDOWN',
  COMPLETED = 'COMPLETED',
}

export enum RoomType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  TOURNAMENT = 'TOURNAMENT',
}
export enum KYCStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

