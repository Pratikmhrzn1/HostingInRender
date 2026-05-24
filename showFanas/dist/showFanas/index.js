"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const teenPattiEngine_1 = require("./teenPattiEngine");
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map();
function triggerReveal(roomId, room) {
    if (!room.game || room.game.gameOver)
        return;
    // Cancel timer if still running
    if (room.revealTimer) {
        clearTimeout(room.revealTimer);
        room.revealTimer = null;
    }
    console.log(`Revealing cards in room ${roomId}`);
    const winner = room.game.showdown();
    io.to(roomId).emit('show_cards', room.game.players.map(p => ({
        playerId: p.id,
        cards: p.cards,
    })));
    io.to(roomId).emit('round_result', {
        winnerPlayer: { id: winner.id }
    });
    console.log(`Winner in room ${roomId}: player ${winner.id}`);
}
function startGame(roomId, room) {
    const ids = Array.from(room.playerIds.values()).map(p => p.id);
    room.game = new teenPattiEngine_1.TeenPattiGame(ids, 100, 10, 10);
    room.readyToReveal = new Set();
    io.to(roomId).emit('game_start', {});
    // Deal cards privately to each player
    room.game.players.forEach(player => {
        const entry = [...room.playerIds.entries()]
            .find(([, p]) => p.id === player.id);
        if (entry) {
            const [socketId] = entry;
            io.to(socketId).emit('card_deal', { cards: player.cards });
        }
    });
    io.to(roomId).emit('game_state', room.game.getState());
    console.log(`Game started in room ${roomId} with players: ${ids}`);
    // ✅ 15s fallback — force reveal if not all players flip in time
    room.revealTimer = setTimeout(() => {
        console.log(`15s timer up — force revealing in room ${roomId}`);
        triggerReveal(roomId, room);
    }, 15000);
}
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    // ── 1. Player joins room ──────────────────────────────────────
    socket.on('join_game', ({ roomId, playerId, username, avatar }) => {
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
                readyToReveal: new Set(),
                revealTimer: null,
            });
        }
        const room = rooms.get(roomId);
        const alreadyIn = [...room.playerIds.values()]
            .find(p => p.id === playerId);
        if (alreadyIn) {
            socket.emit('error', { message: 'Already in room' });
            return;
        }
        room.playerIds.set(socket.id, { id: playerId, username, avatar });
        const existingPlayers = [...room.playerIds.entries()]
            .filter(([sockId]) => sockId !== socket.id)
            .map(([, p]) => p);
        socket.emit('existing_players', { players: existingPlayers });
        socket.to(roomId).emit('player_joined', {
            player: { id: playerId, username, avatar }
        });
        console.log(`Player ${username} joined room ${roomId}`);
        console.log(`Players in room: ${room.playerIds.size}`);
        if (room.playerIds.size >= 2 && !room.game) {
            startGame(roomId, room);
        }
    });
    // ── 2. Player flipped all their cards ────────────────────────
    socket.on('player_ready', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room)
            return;
        const player = room.playerIds.get(socket.id);
        if (!player)
            return;
        room.readyToReveal.add(player.id);
        console.log(`Player ${player.username} ready in room ${roomId}`);
        console.log(`Ready: ${room.readyToReveal.size}/${room.playerIds.size}`);
        // Tell all clients how many are ready
        io.to(roomId).emit('reveal_status', {
            readyCount: room.readyToReveal.size,
            totalCount: room.playerIds.size,
        });
        // ✅ All players flipped — reveal immediately, no waiting
        if (room.readyToReveal.size === room.playerIds.size) {
            room.readyToReveal.clear();
            triggerReveal(roomId, room);
        }
    });
    // ── 3. Play again ─────────────────────────────────────────────
    socket.on('play_again', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room)
            return;
        const player = room.playerIds.get(socket.id);
        if (!player)
            return;
        room.readyForRematch.add(player.id);
        console.log(`Player ${player.username} wants rematch in room ${roomId}`);
        console.log(`Rematch ready: ${room.readyForRematch.size}/${room.playerIds.size}`);
        io.to(roomId).emit('rematch_status', {
            readyCount: room.readyForRematch.size,
            totalCount: room.playerIds.size,
        });
        if (room.readyForRematch.size === room.playerIds.size) {
            console.log(`All players ready for rematch in room ${roomId}`);
            room.readyForRematch.clear();
            room.game = null;
            io.to(roomId).emit('rematch_starting', {});
            setTimeout(() => {
                startGame(roomId, room);
            }, 1000);
        }
    });
    // ── 4. Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        rooms.forEach((room, roomId) => {
            const player = room.playerIds.get(socket.id);
            if (!player)
                return;
            room.playerIds.delete(socket.id);
            io.to(roomId).emit('player_left', { playerId: player.id });
            console.log(`Player ${player.username} left room ${roomId}`);
            console.log(`Players remaining: ${room.playerIds.size}`);
            if (room.playerIds.size === 0) {
                if (room.revealTimer)
                    clearTimeout(room.revealTimer);
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted`);
            }
        });
    });
});
httpServer.listen(3000, () => console.log('Server running on port 3000'));
