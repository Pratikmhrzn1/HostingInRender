import { Context } from 'koa';
import AppDataSource from '@/config/database';
import { Game } from '@/models/Game.entity';
import { GameHistory } from '@/models/GameHistory.entity';
import { successResponse, errorResponse } from '@/utils/response';
import { CustomContext, GamePhase } from '@/types';
import { redisClient } from '@/config/redis';

// Define the shape of table data from Redis
interface TableData {
  gameType?: string;
  bootAmount?: string;
  currentPlayers?: string;
  maxPlayers?: string;
}

export const getGameList = async (ctx: Context): Promise<void> => {
  try {
    // Get available tables from Redis
    const tables = await redisClient.keys('table:*');
    const tableData = await Promise.all(
      tables.map(async (key: string) => {
        const data = await redisClient.hgetall(key) as TableData;
        return {
          tableId: key.replace('table:', ''),
          gameType: data.gameType,
          bootAmount: data.bootAmount,
          currentPlayers: data.currentPlayers || 0,
          maxPlayers: data.maxPlayers,
        };
      })
    );

    successResponse(ctx, { tables: tableData }, 'Games list retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get games list', 500);
  }
};

export const joinTable = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { tableId } = ctx.state.validated;
    
    // Check table availability in Redis
    const tableKey = `table:${tableId}`;
    const tableData = await redisClient.hgetall(tableKey) as TableData;
    
    if (!tableData || Object.keys(tableData).length === 0) {
      errorResponse(ctx, 'Table not found', 404);
      return;
    }

    // Add player to table
    const currentPlayers = parseInt(tableData.currentPlayers || '0', 10);
    const maxPlayers = parseInt(tableData.maxPlayers || '0', 10);
    
    if (currentPlayers >= maxPlayers) {
      errorResponse(ctx, 'Table is full', 400);
      return;
    }

    await redisClient.hincrby(tableKey, 'currentPlayers', 1);
    await redisClient.sadd(`table:${tableId}:players`, ctx.user.id);

    successResponse(ctx, { tableId, joined: true }, 'Joined table successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to join table', 500);
  }
};

export const leaveTable = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { tableId } = ctx.state.validated;
    
    const tableKey = `table:${tableId}`;
    await redisClient.hincrby(tableKey, 'currentPlayers', -1);
    await redisClient.srem(`table:${tableId}:players`, ctx.user.id);

    successResponse(ctx, { tableId, left: true }, 'Left table successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to leave table', 500);
  }
};

export const getGameHistory = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { page = 1, limit = 20 } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    const historyRepository = AppDataSource.getRepository(GameHistory);
    const [histories, total] = await historyRepository
      .createQueryBuilder('history')
      .where('history.players @> :player', { player: JSON.stringify([{ userId: ctx.user.id }]) })
      .orderBy('history.createdAt', 'DESC')
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount();

    successResponse(ctx, {
      histories: histories.map((h: GameHistory) => ({
        id: h.id,
        gameId: h.gameId,
        gameType: h.gameType,
        pot: parseFloat(h.pot.toString()),
        rake: parseFloat(h.rake.toString()),
        winner: h.winner,
        startedAt: h.startedAt,
        endedAt: h.endedAt,
        duration: h.duration,
        players: h.players.map((player) => ({
          userId: player.userId,
          seatNumber: player.seatNumber,
          result: player.result,
          chipsIn: Number.isFinite(Number(player.chipsIn)) ? Number(player.chipsIn) : 0,
          chipsOut: Number.isFinite(Number(player.chipsOut)) ? Number(player.chipsOut) : 0,
        })),
        actions: (h.actions || []).map((action) => {
          const payload = action.description || action.details || action.value || action.payload || action;
          const serialized = typeof payload === 'string' ? payload : payload ? JSON.stringify(payload) : '';
          const detail = serialized.length > 160 ? `${serialized.slice(0, 160)}…` : serialized;
          return {
            type: action.type || action.event || 'action',
            actor: action.playerId ?? action.userId ?? action.actor ?? null,
            detail,
            timestamp: action.timestamp || action.time || null,
          };
        }),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Game history retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get game history', 500);
  }
};

export const getLiveGames = async (ctx: Context): Promise<void> => {
  try {
    const gameRepository = AppDataSource.getRepository(Game);
    const allGames = await gameRepository.find({
      take: 50,
      order: { createdAt: 'DESC' },
    });

    // Filter games with betting phase
    const liveGames = allGames.filter(
      (game: Game) => game.gameState?.phase === GamePhase.BETTING
    ).slice(0, 20);

    successResponse(ctx, {
      games: liveGames.map((g: Game) => ({
        id: g.id,
        tableId: g.tableId,
        gameType: g.gameType,
        currentPlayers: g.currentPlayers.length,
        pot: g.gameState.pot,
      })),
    }, 'Live games retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get live games', 500);
  }
};
