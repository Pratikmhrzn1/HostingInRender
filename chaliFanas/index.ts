import { Server } from 'socket.io';
import { createServer } from 'http';
import { TeenPattiGame } from './teenPattiEngine';
import { PlayerStatus } from './shared/sharedCardsEngine';
import dotenv from 'dotenv';
dotenv.config();
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

interface RoomPlayer {
    id: number;
    username: string;
    avatar: string | null;
}

interface Room {
    game: InstanceType<typeof TeenPattiGame> | null;
    playerIds: Map<string, RoomPlayer>;
    readyForRematch: Set<number>;
    currentTurnTimeout: ReturnType<typeof setTimeout> | null;
    showdownVotes: Set<number>;
}

const rooms = new Map<string, Room>();

const MIN_BET       = 10;
const BOOT_AMOUNT   = 10;
const STARTING_CHIPS = 500;
const TURN_TIMEOUT  = 30000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSocketId(room: Room, playerId: number): string | undefined {
    return [...room.playerIds.entries()]
        .find(([, p]) => p.id === playerId)?.[0];
}

function broadcastGameState(roomId: string, room: Room) {
    if (!room.game) return;
    io.to(roomId).emit('game_state', room.game.getState());
}

function broadcastShowdownVotes(roomId: string, room: Room, votedPlayerId: number | null) {
    if (!room.game) return;
    const state = room.game.getState();
    const activePlayers = state.players.filter(p => p.status === PlayerStatus.Active);
    const totalActive = activePlayers.length;
    const needed = totalActive === 2
        ? 2
        : Math.ceil(totalActive / 2);

    io.to(roomId).emit('showdown_vote', {
        votedCount: room.showdownVotes.size,
        totalActive,
        needed,
        votedPlayerId,
    });
}

function checkGameOver(roomId: string, room: Room) {
    if (!room.game) return;
    const state = room.game.getState();
    if (!state.gameOver || state.winner === undefined) return;

    if (room.currentTurnTimeout) {
        clearTimeout(room.currentTurnTimeout);
        room.currentTurnTimeout = null;
    }

    io.to(roomId).emit('show_cards',
        room.game.players.map(p => ({
            playerId: p.id,
            cards: p.cards,
        }))
    );

    io.to(roomId).emit('round_result', {
        winnerPlayer: { id: state.winner }
    });

    console.log(`Game over in room ${roomId} — winner: ${state.winner}`);
}

function nextTurnTimeout(roomId: string, room: Room) {
    if (room.currentTurnTimeout) clearTimeout(room.currentTurnTimeout);
    if (!room.game || room.game.gameOver) return;

    const state = room.game.getState();
    const currentPlayerId = state.currentTurn;

    room.currentTurnTimeout = setTimeout(() => {
        if (!room.game || room.game.gameOver) return;
        try {
            room.game.fold(currentPlayerId);
            room.showdownVotes.delete(currentPlayerId);

            io.to(roomId).emit('player_action', {
                playerId: currentPlayerId,
                action: 'fold',
                reason: 'timeout',
            });

            checkGameOver(roomId, room);
            broadcastGameState(roomId, room);
            broadcastShowdownVotes(roomId, room, null);

            if (!room.game.gameOver) {
                nextTurnTimeout(roomId, room);
            }
        } catch (e) {
            console.error('Timeout fold error:', e);
        }
    }, TURN_TIMEOUT);
}

function triggerShowdown(roomId: string, room: Room) {
    if (!room.game || room.game.gameOver) return;

    if (room.currentTurnTimeout) {
        clearTimeout(room.currentTurnTimeout);
        room.currentTurnTimeout = null;
    }

    room.showdownVotes.clear();

    const winner = room.game.showdown();

    io.to(roomId).emit('show_cards',
        room.game.players.map(p => ({
            playerId: p.id,
            cards: p.cards,
        }))
    );

    io.to(roomId).emit('round_result', {
        winnerPlayer: { id: winner.id }
    });

    broadcastGameState(roomId, room);
    console.log(`Showdown in room ${roomId} — winner: ${winner.id}`);
}

function startGame(roomId: string, room: Room) {
    const ids = Array.from(room.playerIds.values()).map(p => p.id);
    room.game = new TeenPattiGame(ids, STARTING_CHIPS, BOOT_AMOUNT, MIN_BET);
    room.showdownVotes = new Set();

    io.to(roomId).emit('game_start', {});

    // Deal cards privately
    room.game.players.forEach(player => {
        const socketId = getSocketId(room, player.id);
        if (socketId) {
            io.to(socketId).emit('card_deal', { cards: player.cards });
        }
    });

    broadcastGameState(roomId, room);
    nextTurnTimeout(roomId, room);

    console.log(`Game started in room ${roomId} with players: ${ids}`);
}

// ── Socket ────────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);

    // ── 1. Join room ──────────────────────────────────────────────
    socket.on('join_game', ({
        roomId, playerId, username, avatar,
    }: {
        roomId: string;
        playerId: number;
        username: string;
        avatar: string | null;
    }) => {
        if (!roomId || !playerId || !username) {
            socket.emit('error', { message: 'Missing required fields' });
            return;
        }

        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                game: null,
                playerIds: new Map(),
                readyForRematch: new Set(),
                currentTurnTimeout: null,
                showdownVotes: new Set(),
            });
        }

        const room = rooms.get(roomId)!;

        // Prevent duplicate join
        const alreadyIn = [...room.playerIds.values()]
            .find(p => p.id === playerId);
        if (alreadyIn) {
            socket.emit('error', { message: 'Already in room' });
            return;
        }

        room.playerIds.set(socket.id, { id: playerId, username, avatar });

        // Send new player list of existing players
        const existingPlayers = [...room.playerIds.entries()]
            .filter(([sockId]) => sockId !== socket.id)
            .map(([, p]) => p);

        socket.emit('existing_players', { players: existingPlayers });

        // Tell everyone else
        socket.to(roomId).emit('player_joined', {
            player: { id: playerId, username, avatar },
        });

        console.log(`Player ${username} joined room ${roomId}`);
        console.log(`Players in room: ${room.playerIds.size}`);

        if (room.playerIds.size >= 2 && !room.game) {
            startGame(roomId, room);
        }
    });

    // ── 2. Bet blind ──────────────────────────────────────────────
    socket.on('bet_blind', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room?.game) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        try {
            room.game.placeBet(player.id, MIN_BET);

            io.to(roomId).emit('player_action', {
                playerId: player.id,
                action: 'bet_blind',
                amount: MIN_BET,
            });

            checkGameOver(roomId, room);
            broadcastGameState(roomId, room);

            if (!room.game.gameOver) nextTurnTimeout(roomId, room);

            console.log(`${player.username} bet blind ${MIN_BET} in ${roomId}`);
        } catch (e: any) {
            socket.emit('action_error', { message: e.message });
        }
    });

    // ── 3. See cards ──────────────────────────────────────────────
    socket.on('see_cards', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room?.game) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        try {
            room.game.seeCards(player.id);

            io.to(roomId).emit('player_action', {
                playerId: player.id,
                action: 'see_cards',
            });

            broadcastGameState(roomId, room);

            console.log(`${player.username} saw cards in ${roomId}`);
        } catch (e: any) {
            socket.emit('action_error', { message: e.message });
        }
    });

    // ── 4. Bet seen ───────────────────────────────────────────────
    socket.on('bet_seen', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room?.game) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        try {
            const betAmount = MIN_BET * 2;
            room.game.placeBet(player.id, betAmount);

            io.to(roomId).emit('player_action', {
                playerId: player.id,
                action: 'bet_seen',
                amount: betAmount,
            });

            checkGameOver(roomId, room);
            broadcastGameState(roomId, room);

            if (!room.game.gameOver) nextTurnTimeout(roomId, room);

            console.log(`${player.username} bet seen ${betAmount} in ${roomId}`);
        } catch (e: any) {
            socket.emit('action_error', { message: e.message });
        }
    });

    // ── 5. Fold ───────────────────────────────────────────────────
    socket.on('fold', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room?.game) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        try {
            room.game.fold(player.id);

            // Remove their showdown vote
            room.showdownVotes.delete(player.id);

            io.to(roomId).emit('player_action', {
                playerId: player.id,
                action: 'fold',
            });

            checkGameOver(roomId, room);
            broadcastGameState(roomId, room);

            // Re-broadcast vote status with updated active count
            broadcastShowdownVotes(roomId, room, null);

            if (!room.game.gameOver) nextTurnTimeout(roomId, room);

            console.log(`${player.username} folded in ${roomId}`);
        } catch (e: any) {
            socket.emit('action_error', { message: e.message });
        }
    });

    // ── 6. Showdown vote ──────────────────────────────────────────
    socket.on('showdown', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room?.game) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        const state = room.game.getState();
        const activePlayers = state.players.filter(p => p.status === PlayerStatus.Active);

        // Only active players can vote
        const isActive = activePlayers.find(p => p.id === player.id);
        if (!isActive) {
            socket.emit('action_error', {
                message: 'Folded players cannot call showdown',
            });
            return;
        }

        // Add vote
        room.showdownVotes.add(player.id);

        // Remove stale votes from folded players
        room.showdownVotes.forEach(id => {
            const stillActive = activePlayers.find(p => p.id === id);
            if (!stillActive) room.showdownVotes.delete(id);
        });

        const totalActive = activePlayers.length;
        const needed = totalActive === 2
            ? 2
            : Math.ceil(totalActive / 2);
        const votes = room.showdownVotes.size;

        console.log(`Showdown vote: ${votes}/${needed} in room ${roomId}`);

        // Broadcast vote status to all
        io.to(roomId).emit('showdown_vote', {
            votedCount: votes,
            totalActive,
            needed,
            votedPlayerId: player.id,
        });

        // ✅ Enough votes — trigger showdown
        if (votes >= needed) {
            triggerShowdown(roomId, room);
        }
    });

    // ── 7. Play again ─────────────────────────────────────────────
    socket.on('play_again', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.playerIds.get(socket.id);
        if (!player) return;

        room.readyForRematch.add(player.id);

        console.log(`${player.username} wants rematch in ${roomId}`);
        console.log(`Rematch: ${room.readyForRematch.size}/${room.playerIds.size}`);

        io.to(roomId).emit('rematch_status', {
            readyCount: room.readyForRematch.size,
            totalCount: room.playerIds.size,
        });

        if (room.readyForRematch.size === room.playerIds.size) {
            room.readyForRematch.clear();
            room.game = null;

            io.to(roomId).emit('rematch_starting', {});

            setTimeout(() => startGame(roomId, room), 1000);

            console.log(`Rematch starting in ${roomId}`);
        }
    });

    // ── 8. Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`Disconnected: ${socket.id}`);

        rooms.forEach((room, roomId) => {
            const player = room.playerIds.get(socket.id);
            if (!player) return;

            room.playerIds.delete(socket.id);
            room.showdownVotes.delete(player.id);

            io.to(roomId).emit('player_left', { playerId: player.id });

            console.log(`${player.username} left room ${roomId}`);
            console.log(`Players remaining: ${room.playerIds.size}`);

            // Try to fold disconnected player if game is running
            if (room.game && !room.game.gameOver) {
                try {
                    room.game.fold(player.id);
                    checkGameOver(roomId, room);
                    broadcastGameState(roomId, room);
                    broadcastShowdownVotes(roomId, room, null);
                    if (!room.game.gameOver) nextTurnTimeout(roomId, room);
                } catch (e) {
                    // Player may already be folded
                }
            }

            if (room.playerIds.size === 0) {
                if (room.currentTurnTimeout) clearTimeout(room.currentTurnTimeout);
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted`);
            }
        });
    });
});

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Full game server running on port ${PORT}`);
});