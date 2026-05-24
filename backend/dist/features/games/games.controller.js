"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveGames = exports.getGameHistory = exports.leaveTable = exports.joinTable = exports.getGameList = void 0;
const database_1 = __importDefault(require("@/config/database"));
const Game_entity_1 = require("@/models/Game.entity");
const GameHistory_entity_1 = require("@/models/GameHistory.entity");
const response_1 = require("@/utils/response");
const types_1 = require("@/types");
const redis_1 = require("@/config/redis");
const getGameList = async (ctx) => {
    try {
        // Get available tables from Redis
        const tables = await redis_1.redisClient.keys('table:*');
        const tableData = await Promise.all(tables.map(async (key) => {
            const data = await redis_1.redisClient.hgetall(key);
            return {
                tableId: key.replace('table:', ''),
                gameType: data.gameType,
                bootAmount: data.bootAmount,
                currentPlayers: data.currentPlayers || 0,
                maxPlayers: data.maxPlayers,
            };
        }));
        (0, response_1.successResponse)(ctx, { tables: tableData }, 'Games list retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get games list', 500);
    }
};
exports.getGameList = getGameList;
const joinTable = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { tableId } = ctx.state.validated;
        // Check table availability in Redis
        const tableKey = `table:${tableId}`;
        const tableData = await redis_1.redisClient.hgetall(tableKey);
        if (!tableData || Object.keys(tableData).length === 0) {
            (0, response_1.errorResponse)(ctx, 'Table not found', 404);
            return;
        }
        // Add player to table
        const currentPlayers = parseInt(tableData.currentPlayers || '0', 10);
        const maxPlayers = parseInt(tableData.maxPlayers || '0', 10);
        if (currentPlayers >= maxPlayers) {
            (0, response_1.errorResponse)(ctx, 'Table is full', 400);
            return;
        }
        await redis_1.redisClient.hincrby(tableKey, 'currentPlayers', 1);
        await redis_1.redisClient.sadd(`table:${tableId}:players`, ctx.user.id);
        (0, response_1.successResponse)(ctx, { tableId, joined: true }, 'Joined table successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to join table', 500);
    }
};
exports.joinTable = joinTable;
const leaveTable = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { tableId } = ctx.state.validated;
        const tableKey = `table:${tableId}`;
        await redis_1.redisClient.hincrby(tableKey, 'currentPlayers', -1);
        await redis_1.redisClient.srem(`table:${tableId}:players`, ctx.user.id);
        (0, response_1.successResponse)(ctx, { tableId, left: true }, 'Left table successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to leave table', 500);
    }
};
exports.leaveTable = leaveTable;
const getGameHistory = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { page = 1, limit = 20 } = ctx.query;
        const skip = (Number(page) - 1) * Number(limit);
        const historyRepository = database_1.default.getRepository(GameHistory_entity_1.GameHistory);
        const [histories, total] = await historyRepository
            .createQueryBuilder('history')
            .where('history.players @> :player', { player: JSON.stringify([{ userId: ctx.user.id }]) })
            .orderBy('history.createdAt', 'DESC')
            .skip(skip)
            .take(Number(limit))
            .getManyAndCount();
        (0, response_1.successResponse)(ctx, {
            histories: histories.map((h) => ({
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
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get game history', 500);
    }
};
exports.getGameHistory = getGameHistory;
const getLiveGames = async (ctx) => {
    try {
        const gameRepository = database_1.default.getRepository(Game_entity_1.Game);
        const allGames = await gameRepository.find({
            take: 50,
            order: { createdAt: 'DESC' },
        });
        // Filter games with betting phase
        const liveGames = allGames.filter((game) => game.gameState?.phase === types_1.GamePhase.BETTING).slice(0, 20);
        (0, response_1.successResponse)(ctx, {
            games: liveGames.map((g) => ({
                id: g.id,
                tableId: g.tableId,
                gameType: g.gameType,
                currentPlayers: g.currentPlayers.length,
                pot: g.gameState.pot,
            })),
        }, 'Live games retrieved successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get live games', 500);
    }
};
exports.getLiveGames = getLiveGames;
