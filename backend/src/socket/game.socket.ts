import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from '@/config/logger';
import { gameHandler } from '../../socket/gameHandler';
import AppDataSource from '@/config/database';
import { User } from '@/models/User.entity';

const JWT_SECRET = process.env.JWT_SECRET || 'ludo-jwt-secret-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (isProduction ? null : 'http://localhost:5173');

const socketCorsOptions = CLIENT_URL
  ? { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true }
  : { origin: true, methods: ['GET', 'POST'], credentials: true };

function respondWithUser(user: any) {
  if (!user) return null;
  const balance = user.wallet?.balance ? parseFloat(user.wallet.balance.toString()) : 0;
  const bonusBalance = user.wallet?.bonusBalance ? parseFloat(user.wallet.bonusBalance.toString()) : 0;
  const lockedAmount = user.wallet?.lockedAmount ? parseFloat(user.wallet.lockedAmount.toString()) : 0;
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    name: user.name || user.username,
    phone: user.phone || null,
    avatar: user.avatar || null,
    isVerified: Boolean(user.is_verified || user.isVerified),
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    points: balance,
    bonusBalance,
    lockedAmount,
  };
}

type AuthenticatedSocket = Socket & {
  user?: ReturnType<typeof respondWithUser>;
};

function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function getTokenFromSocket(socket: Socket) {
  const authToken = socket.handshake.auth?.token;
  const queryToken = socket.handshake.query?.token;
  return (
    (typeof authToken === 'string' && authToken.trim().length ? authToken : null) ||
    (typeof queryToken === 'string' && queryToken.trim().length ? queryToken : null) ||
    null
  );
}


export class GameSocket {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: socketCorsOptions,
      pingTimeout: 30000,
      pingInterval: 10000,
      transports: ['websocket', 'polling'],
    });

    this.io.use((socket, next) => this.authenticateSocket(socket as AuthenticatedSocket, next));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.id}`);
      gameHandler(this.io, socket as any);
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    const token = getTokenFromSocket(socket);
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded && decoded.userId) {
        const user = await AppDataSource.getRepository(User).findOne({
          where: { id: decoded.userId },
          relations: ['wallet'],
        });
        if (user) {
          socket.user = respondWithUser(user);
        }
      }
    }
    next();
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
