// socket/gameHandler.js
// Handles all Socket.IO game events

const { v4: uuidv4 } = require('uuid');
const {
  createGameState,
  createPlayer,
  getMovableTokens,
  applyMove,
  checkWinner,
  nextTurn,
  serializeState,
} = require('../models/gameState');
const COLORS = ['red', 'green', 'yellow', 'blue'];
const BOT_ROLL_DELAY_MS = 900;
const BOT_MOVE_DELAY_MS = 700;
const BOT_ADVANCE_DELAY_MS = 900;
const DEFAULT_BID_POINTS = 20;
const MIN_BID_POINTS = 0;
const INACTIVITY_LIMIT_MS = 30 * 1000;
const OFFLINE_REMOVAL_MS = 60 * 1000;
const AUTO_MOVE_DELAY_MS = 600;
const BID_DISTRIBUTION = {
  2: [0.7, 0.3],
  3: [0.55, 0.3, 0.15],
  4: [0.5, 0.3, 0.2],
};

// In-memory store: roomId -> gameState
const rooms = new Map();
// socketId -> { roomId, playerIndex }
const socketToRoom = new Map();
// roomId -> active timeout id
const botTurnTimers = new Map();
// roomId -> inactivity timeout
const inactivityTimers = new Map();
// roomId:playerIndex -> removal timeout
const offlineRemovalTimers = new Map();

function getRoomBySocket(socketId) {
  const info = socketToRoom.get(socketId);
  if (!info) return null;
  return { ...info, gameState: rooms.get(info.roomId) };
}

function broadcastState(io, roomId) {
  const gameState = rooms.get(roomId);
  if (!gameState) return;
  io.to(roomId).emit('gameState', serializeState(gameState));
}

function persistRoom() {
  // Persistence disabled while SQLite has been removed.
}

function clearBotTimer(roomId) {
  const timer = botTurnTimers.get(roomId);
  if (timer) clearTimeout(timer);
  botTurnTimers.delete(roomId);
}

function pickBotMove(movable) {
  if (!movable || movable.length === 0) return null;
  const priority = { home: 5, enterStretch: 4, moveStretch: 3, exit: 2, move: 1 };
  return movable
    .slice()
    .sort((a, b) => {
      const diff = (priority[b.action] || 0) - (priority[a.action] || 0);
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    })[0];
}

function getAuthenticatedUser(socket) {
  return socket.user || null;
}

function getDisplayName(socket, providedName, fallback) {
  const candidate = providedName?.trim();
  if (candidate) return candidate;
  const user = getAuthenticatedUser(socket);
  if (user?.username) return user.username;
  return fallback;
}

function findWaitingRoom() {
  for (const [roomId, gameState] of rooms.entries()) {
    if (gameState.status === 'waiting' && gameState.players.length < gameState.maxPlayers) {
      return roomId;
    }
  }
  return null;
}

function addPlayerToGameState(socket, gameState, roomId, providedName) {
  const playerIndex = gameState.players.length;
  const color = COLORS[playerIndex];
  const name = getDisplayName(socket, providedName, `Player ${playerIndex + 1}`);
  const user = getAuthenticatedUser(socket);
  const bidPoints = null;
  const player = createPlayer(socket.id, name, color, playerIndex, {
    userId: user?.id ?? null,
    pointsSnapshot: user?.points ?? 0,
    bidPoints,
  });
  gameState.players.push(player);
  socketToRoom.set(socket.id, { roomId, playerIndex });
  socket.join(roomId);
  return player;
}

function cancelOfflineRemovalTimer(roomId, playerIndex) {
  const key = `${roomId}:${playerIndex}`;
  const timer = offlineRemovalTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    offlineRemovalTimers.delete(key);
  }
}

function processCreateRoom(io, socket, playerName, callback) {
  try {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const gameState = createGameState(roomId);
    const player = addPlayerToGameState(socket, gameState, roomId, playerName);
    rooms.set(roomId, gameState);

    console.log(`[CREATE] Room ${roomId} by ${player.name}`);
    callback?.({ success: true, roomId, playerIndex: player.colorIndex, color: player.color });
    broadcastState(io, roomId);
    persistRoom(roomId);
  } catch (err) {
    console.error('[createRoom]', err);
    callback?.({ success: false, error: 'Failed to create room' });
  }
}

function processJoinRoom(io, socket, roomId, playerName, callback) {
  try {
    const normalizedId = roomId?.trim()?.toUpperCase();
    if (!normalizedId) {
      return callback?.({ success: false, error: 'Room ID is required' });
    }
    const gameState = rooms.get(normalizedId);
    if (!gameState) {
      return callback?.({ success: false, error: 'Room not found' });
    }
    if (gameState.status === 'finished') {
      return callback?.({ success: false, error: 'Game already finished' });
    }

    const reconnectIdx = gameState.players.findIndex(
      (p) => !p.connected && p.name === (playerName || getAuthenticatedUser(socket)?.username)
    );
    if (reconnectIdx !== -1) {
      const player = gameState.players[reconnectIdx];
      player.socketId = socket.id;
      player.connected = true;
      player.disconnectedAt = null;
      cancelOfflineRemovalTimer(normalizedId, reconnectIdx);
      socketToRoom.set(socket.id, { roomId: normalizedId, playerIndex: reconnectIdx });
      socket.join(normalizedId);
      console.log(`[RECONNECT] ${player.name} to ${normalizedId}`);
      callback?.({
        success: true,
        roomId: normalizedId,
        playerIndex: reconnectIdx,
        color: player.color,
        reconnected: true,
      });
      broadcastState(io, normalizedId);
      persistRoom(normalizedId);
      return;
    }

    if (gameState.players.length >= gameState.maxPlayers) {
      return callback?.({ success: false, error: 'Room is full' });
    }
    if (gameState.status === 'playing') {
      return callback?.({ success: false, error: 'Game already started' });
    }

    const player = addPlayerToGameState(socket, gameState, normalizedId, playerName);

    console.log(`[JOIN] ${player.name} joined ${normalizedId} as ${player.color}`);
    callback?.({ success: true, roomId: normalizedId, playerIndex: player.colorIndex, color: player.color });
    broadcastState(io, normalizedId);
    persistRoom(normalizedId);
  } catch (err) {
    console.error('[joinRoom]', err);
    callback?.({ success: false, error: 'Failed to join room' });
  }
}

function handlePlayerMove(io, gameState, roomId, playerIndex, tokenIndex) {
  clearInactivityTimer(roomId);
  const currentPlayer = gameState.players[playerIndex];
  const { capturedToken, extraTurn } = applyMove(
    gameState,
    playerIndex,
    tokenIndex,
    gameState.diceValue
  );

  const winner = checkWinner(gameState);
  if (winner) {
    gameState.status = 'finished';
    gameState.winner = winner.color;
    gameState.lastAction = { type: 'win', player: winner.color };
    console.log(`[WIN] ${winner.name} wins room ${roomId}`);
    clearBotTimer(roomId);
    distributePlacementPoints(io, gameState, roomId);
    gameState.bidPot = 0;
    broadcastState(io, roomId);
    persistRoom(roomId);
    io.to(roomId).emit('gameOver', { winner: winner.color, winnerName: winner.name });
    return { winner };
  }

  gameState.lastAction = {
    type: capturedToken ? 'capture' : 'move',
    player: currentPlayer.color,
    tokenIndex,
    capturedToken,
  };

  if (extraTurn) {
    gameState.diceValue = null;
    gameState.diceRolled = false;
    gameState.hasValidMove = false;
    gameState.movableTokens = [];
    io.to(roomId).emit('extraTurn', {
      playerIndex,
      reason: capturedToken ? 'capture' : 'six_or_home',
    });
  } else {
    nextTurn(gameState);
  }

  console.log(`[MOVE] ${currentPlayer.name} moved token ${tokenIndex}, extra=${extraTurn}`);
  broadcastState(io, roomId);
  scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
  scheduleInactivityTimer(io, roomId);
  return { capturedToken, extraTurn };
}

function maybeAutoMove(io, roomId, playerIndex, movable) {
  if (!movable || movable.length !== 1) return;
  setTimeout(() => {
    const gameState = rooms.get(roomId);
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.currentPlayerIndex !== playerIndex) return;
    handlePlayerMove(io, gameState, roomId, playerIndex, movable[0].tokenIndex);
  }, AUTO_MOVE_DELAY_MS);
}

function clearInactivityTimer(roomId) {
  const timer = inactivityTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    inactivityTimers.delete(roomId);
  }
}

function scheduleInactivityTimer(io, roomId) {
  clearInactivityTimer(roomId);
  const gameState = rooms.get(roomId);
  if (!gameState || gameState.status !== 'playing') return;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isBot || !currentPlayer.connected) return;
  const timer = setTimeout(() => {
    autoPlayForInactive(io, roomId);
  }, INACTIVITY_LIMIT_MS);
  inactivityTimers.set(roomId, timer);
}

function rollDiceForPlayer(gameState, playerIndex) {
  const diceValue = Math.floor(Math.random() * 6) + 1;
  gameState.diceValue = diceValue;
  gameState.diceRolled = true;
  const player = gameState.players[playerIndex];
  const movable = getMovableTokens(player, diceValue, gameState.players);
  gameState.hasValidMove = movable.length > 0;
  gameState.movableTokens = movable.map((m) => m.tokenIndex);
  player.lastActiveAt = Date.now();
  return { diceValue, movable };
}

function autoPlayForInactive(io, roomId) {
  clearInactivityTimer(roomId);
  const gameState = rooms.get(roomId);
  if (!gameState || gameState.status !== 'playing') return;
  const playerIndex = gameState.currentPlayerIndex;
  const player = gameState.players[playerIndex];
  if (!player || player.isBot || !player.connected) return;
  player.autoPlay = true;

  if (!gameState.diceRolled) {
    const { diceValue, movable } = rollDiceForPlayer(gameState, playerIndex);
    io.to(roomId).emit('diceRolled', {
      playerIndex,
      diceValue,
      movableTokens: movable,
    });
    broadcastState(io, roomId);
    persistRoom(roomId);

    if (movable.length === 0) {
      gameState.lastAction = { type: 'noMove', player: player.color };
      nextTurn(gameState);
      broadcastState(io, roomId);
    persistRoom(roomId);
      scheduleInactivityTimer(io, roomId);
      return;
    }

    if (movable.length === 1) {
      handlePlayerMove(io, gameState, roomId, playerIndex, movable[0].tokenIndex);
      return;
    }

    scheduleInactivityTimer(io, roomId);
    return;
  }

  const movable = getMovableTokens(player, gameState.diceValue, gameState.players);
  if (movable.length === 0) {
    gameState.lastAction = { type: 'noMove', player: player.color };
    nextTurn(gameState);
    broadcastState(io, roomId);
    persistRoom(roomId);
    scheduleInactivityTimer(io, roomId);
    return;
  }

  const choice = pickBotMove(movable);
  if (choice) {
    handlePlayerMove(io, gameState, roomId, playerIndex, choice.tokenIndex);
  }
}

function convertPlayerToBot(io, roomId, playerIndex, reason) {
  const gameState = rooms.get(roomId);
  if (!gameState) return;
  const player = gameState.players[playerIndex];
  if (!player || player.connected || player.isBot) return;
  player.isBot = true;
  player.autoPlay = true;
  player.autoBotReason = reason;
  player.socketId = `BOT_${roomId}_${playerIndex}`;
  player.name = `${player.name} (bot)`;
  player.userId = null;
  cancelOfflineRemovalTimer(roomId, playerIndex);
  console.log(`[AUTO-BOT] ${player.name} now handling room ${roomId}`);
  broadcastState(io, roomId);
  if (gameState.currentPlayerIndex === playerIndex) {
    nextTurn(gameState);
    broadcastState(io, roomId);
    persistRoom(roomId);
    scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
  }
}

function startOfflineRemovalTimer(io, roomId, playerIndex) {
  const key = `${roomId}:${playerIndex}`;
  cancelOfflineRemovalTimer(roomId, playerIndex);
  const timer = setTimeout(() => {
    convertPlayerToBot(io, roomId, playerIndex, 'offline');
    offlineRemovalTimers.delete(key);
  }, OFFLINE_REMOVAL_MS);
  offlineRemovalTimers.set(key, timer);
}

function distributePlacementPoints(io, gameState, roomId) {
  if (!gameState.bidPot) return;
  const placements = gameState.players
    .map((player) => player)
    .sort((a, b) => {
      if (b.tokensHome !== a.tokensHome) return b.tokensHome - a.tokensHome;
      if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
      if (a.finishedAt) return -1;
      if (b.finishedAt) return 1;
      return (a.lastActiveAt || 0) - (b.lastActiveAt || 0);
    });
  const distribution = BID_DISTRIBUTION[gameState.players.length] || BID_DISTRIBUTION[4];
  let remaining = gameState.bidPot;
  const results = [];

  for (let idx = 0; idx < distribution.length; idx += 1) {
    const player = placements[idx];
    if (!player) break;
    let share = idx === distribution.length - 1 ? remaining : Math.floor(gameState.bidPot * distribution[idx]);
    if (share > remaining) share = remaining;
    remaining -= share;
    const entry = {
      playerName: player.name,
      color: player.color,
      position: idx + 1,
      awarded: share,
    };
    player.pointsSnapshot = (player.pointsSnapshot ?? 0) + share;
    entry.pointsAfter = player.pointsSnapshot;
    results.push(entry);
  }

  if (results.length) {
    io.to(roomId).emit('pointsDistributed', { results });
  }
}

function scheduleBotTurn(io, roomId, delay = BOT_ROLL_DELAY_MS) {
  clearBotTimer(roomId);
  clearInactivityTimer(roomId);
  const gameState = rooms.get(roomId);
  if (!gameState || gameState.status !== 'playing') return;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer?.isBot) return;

  const timer = setTimeout(() => runBotTurn(io, roomId), delay);
  botTurnTimers.set(roomId, timer);
}

function runBotTurn(io, roomId) {
  clearBotTimer(roomId);
  const gameState = rooms.get(roomId);
  if (!gameState || gameState.status !== 'playing') return;

  const playerIndex = gameState.currentPlayerIndex;
  const bot = gameState.players[playerIndex];
  if (!bot?.isBot) return;

  if (!gameState.diceRolled) {
    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = diceValue;
    gameState.diceRolled = true;

    const movable = getMovableTokens(bot, diceValue, gameState.players);
    gameState.hasValidMove = movable.length > 0;
    gameState.movableTokens = movable.map((m) => m.tokenIndex);

    io.to(roomId).emit('diceRolled', {
      playerIndex,
      diceValue,
      movableTokens: movable,
    });

    if (movable.length === 0) {
      gameState.lastAction = { type: 'noMove', player: bot.color };
      broadcastState(io, roomId);
    persistRoom(roomId);
      const timer = setTimeout(() => {
        const activeRoom = rooms.get(roomId);
        if (!activeRoom || activeRoom.status !== 'playing') return;
        nextTurn(activeRoom);
        broadcastState(io, roomId);
    persistRoom(roomId);
        scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
      }, BOT_ADVANCE_DELAY_MS);
      botTurnTimers.set(roomId, timer);
      return;
    }

    broadcastState(io, roomId);
    persistRoom(roomId);
    const timer = setTimeout(() => runBotTurn(io, roomId), BOT_MOVE_DELAY_MS);
    botTurnTimers.set(roomId, timer);
    return;
  }

  const movable = getMovableTokens(bot, gameState.diceValue, gameState.players);
  if (movable.length === 0) {
    nextTurn(gameState);
    broadcastState(io, roomId);
    persistRoom(roomId);
    scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
    return;
  }

  const choice = pickBotMove(movable);
  if (!choice) {
    nextTurn(gameState);
    broadcastState(io, roomId);
    persistRoom(roomId);
    scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
    return;
  }

  const { capturedToken, extraTurn } = applyMove(
    gameState,
    playerIndex,
    choice.tokenIndex,
    gameState.diceValue
  );

  const winner = checkWinner(gameState);
  if (winner) {
    gameState.status = 'finished';
    gameState.winner = winner.color;
    gameState.lastAction = { type: 'win', player: winner.color };
    broadcastState(io, roomId);
    persistRoom(roomId);
    io.to(roomId).emit('gameOver', { winner: winner.color, winnerName: winner.name });
    clearBotTimer(roomId);
    return;
  }

  gameState.lastAction = {
    type: capturedToken ? 'capture' : 'move',
    player: bot.color,
    tokenIndex: choice.tokenIndex,
    capturedToken,
  };

  if (extraTurn) {
    gameState.diceValue = null;
    gameState.diceRolled = false;
    gameState.hasValidMove = false;
    gameState.movableTokens = [];
    io.to(roomId).emit('extraTurn', {
      playerIndex,
      reason: capturedToken ? 'capture' : 'six_or_home',
    });
  } else {
    nextTurn(gameState);
  }

  broadcastState(io, roomId);
  scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
}

function gameHandler(io, socket) {
  // One-time initialization for the module
  if (!gameHandler.initialized) {
    console.log('[INIT] Room persistence disabled (SQLite removed).');
    gameHandler.initialized = true;
  }

  console.log(`[CONNECT] ${socket.id}`);

  // ── CREATE ROOM ──────────────────────────────────────────────────
  socket.on('createRoom', ({ playerName }, callback) => {
    processCreateRoom(io, socket, playerName, callback);
  });

  // ── JOIN ROOM ────────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomId, playerName }, callback) => {
    processJoinRoom(io, socket, roomId, playerName, callback);
  });

  socket.on('autoAssignRoom', ({ playerName }, callback) => {
    const waitingRoomId = findWaitingRoom();
    if (waitingRoomId) {
      return processJoinRoom(io, socket, waitingRoomId, playerName, callback);
    }
    return processCreateRoom(io, socket, playerName, callback);
  });

  socket.on('setBidPoints', ({ bidPoints }, callback) => {
    try {
      const info = getRoomBySocket(socket.id);
      if (!info || !info.gameState) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      const { gameState, playerIndex } = info;
      if (gameState.status !== 'waiting') {
        return callback?.({ success: false, error: 'Game already started' });
      }

      const player = gameState.players[playerIndex];
      if (player.isBot) {
        return callback?.({ success: false, error: 'Bots cannot set bids' });
      }

      const parsedBid = Number(bidPoints);
      if (!Number.isInteger(parsedBid) || parsedBid < MIN_BID_POINTS) {
        return callback?.({ success: false, error: 'Bid must be a non-negative integer' });
      }

      const availablePoints = player.pointsSnapshot ?? 0;
      if (availablePoints < parsedBid) {
        return callback?.({ success: false, error: 'Insufficient points for bid' });
      }

      player.bidPoints = parsedBid;
      player.lastActiveAt = Date.now();
      broadcastState(io, info.roomId);
      persistRoom(info.roomId);
      callback?.({ success: true, bidPoints: parsedBid });
    } catch (err) {
      console.error('[setBidPoints]', err);
      callback?.({ success: false, error: 'Failed to set bid' });
    }
  });

  // ── START GAME ───────────────────────────────────────────────────
  socket.on('addBot', (callback) => {
    try {
      const info = getRoomBySocket(socket.id);
      if (!info || !info.gameState) return callback?.({ success: false, error: 'Not in a room' });

      const { gameState, roomId, playerIndex } = info;
      if (playerIndex !== 0) {
        return callback?.({ success: false, error: 'Only host can add bots' });
      }
      if (gameState.status !== 'waiting') {
        return callback?.({ success: false, error: 'Can only add bots before game starts' });
      }
      if (gameState.players.length >= gameState.maxPlayers) {
        return callback?.({ success: false, error: 'Room is full' });
      }

      const newIndex = gameState.players.length;
      const color = COLORS[newIndex];
      const botCount = gameState.players.filter((p) => p.isBot).length + 1;
      const bot = createPlayer(`BOT_${roomId}_${newIndex}`, `Bot ${botCount}`, color, newIndex, { isBot: true });
      gameState.players.push(bot);

      console.log(`[BOT] Added ${bot.name} (${bot.color}) to room ${roomId}`);
      callback?.({ success: true, playerIndex: newIndex, color, name: bot.name });
      broadcastState(io, roomId);
    persistRoom(roomId);
    } catch (err) {
      console.error('[addBot]', err);
      callback?.({ success: false, error: 'Failed to add bot' });
    }
  });

  socket.on('startGame', (callback) => {
    try {
      const info = getRoomBySocket(socket.id);
      if (!info || !info.gameState) return callback?.({ success: false, error: 'Not in a room' });

      const { gameState, roomId, playerIndex } = info;

      if (playerIndex !== 0) {
        return callback?.({ success: false, error: 'Only host can start the game' });
      }
      if (gameState.players.length < 2) {
        return callback?.({ success: false, error: 'Need at least 2 players' });
      }
      if (gameState.status !== 'waiting') {
        return callback?.({ success: false, error: 'Game already started' });
      }

      const missingBids = gameState.players.some(
        (player) => !player.isBot && (player.bidPoints === null || player.bidPoints === undefined)
      );
      if (missingBids) {
        return callback?.({ success: false, error: 'All players must set bid points before starting.' });
      }

      gameState.bidPot = 0;
      gameState.biddingComplete = true;
      gameState.players.forEach((player) => {
        if (player.isBot && (player.bidPoints === null || player.bidPoints === undefined)) {
          player.bidPoints = DEFAULT_BID_POINTS;
        }
        if (player.bidPoints === null || player.bidPoints === undefined) {
          player.bidPoints = DEFAULT_BID_POINTS;
        }
        player.committedPoints = player.bidPoints;
        gameState.bidPot += player.bidPoints;
        player.pointsSnapshot = Math.max(0, (player.pointsSnapshot ?? 0) - player.bidPoints);
      });

      gameState.status = 'playing';
      gameState.currentPlayerIndex = 0;
      console.log(`[START] Game in room ${roomId}`);
      broadcastState(io, roomId);
    persistRoom(roomId);
      scheduleBotTurn(io, roomId);
      scheduleInactivityTimer(io, roomId);
      callback?.({ success: true });
    } catch (err) {
      console.error('[startGame]', err);
      callback?.({ success: false, error: 'Failed to start game' });
    }
  });

  // ── ROLL DICE ────────────────────────────────────────────────────
  socket.on('rollDice', (callback) => {
    try {
      const info = getRoomBySocket(socket.id);
      if (!info || !info.gameState) return callback?.({ success: false, error: 'Not in a room' });

      const { gameState, roomId, playerIndex } = info;

      if (gameState.status !== 'playing') {
        return callback?.({ success: false, error: 'Game not in progress' });
      }
      if (gameState.currentPlayerIndex !== playerIndex) {
        return callback?.({ success: false, error: 'Not your turn' });
      }
      if (gameState.diceRolled) {
        return callback?.({ success: false, error: 'Already rolled' });
      }

      clearInactivityTimer(roomId);

      const currentPlayer = gameState.players[playerIndex];
      const { diceValue, movable } = rollDiceForPlayer(gameState, playerIndex);

      console.log(`[ROLL] Player ${gameState.players[playerIndex]?.name} rolled ${diceValue}, movable: ${movable.length}`);

      io.to(roomId).emit('diceRolled', {
        playerIndex,
        diceValue,
        movableTokens: movable,
      });

      // Auto-advance if no moves
      if (movable.length === 0) {
        gameState.lastAction = { type: 'noMove', player: currentPlayer.color };
        setTimeout(() => {
          const activeRoom = rooms.get(roomId);
          if (activeRoom && activeRoom.status === 'playing') {
            nextTurn(activeRoom);
            broadcastState(io, roomId);
    persistRoom(roomId);
            scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
            scheduleInactivityTimer(io, roomId);
          }
        }, 1500);
      }

      maybeAutoMove(io, roomId, playerIndex, movable);

      broadcastState(io, roomId);
    persistRoom(roomId);
      scheduleInactivityTimer(io, roomId);
      callback?.({ success: true, diceValue, movableTokens: movable });
    } catch (err) {
      console.error('[rollDice]', err);
      callback?.({ success: false, error: 'Failed to roll dice' });
    }
  });

  // ── MOVE TOKEN ───────────────────────────────────────────────────
  socket.on('moveToken', ({ tokenIndex }, callback) => {
    try {
      const info = getRoomBySocket(socket.id);
      if (!info || !info.gameState) return callback?.({ success: false, error: 'Not in a room' });

      const { gameState, roomId, playerIndex } = info;

      if (gameState.status !== 'playing') {
        return callback?.({ success: false, error: 'Game not in progress' });
      }
      if (gameState.currentPlayerIndex !== playerIndex) {
        return callback?.({ success: false, error: 'Not your turn' });
      }
      if (!gameState.diceRolled) {
        return callback?.({ success: false, error: 'Roll dice first' });
      }

      // Validate the move
      const currentPlayer = gameState.players[playerIndex];
      const movable = getMovableTokens(currentPlayer, gameState.diceValue, gameState.players);
      const isValidMove = movable.some((m) => m.tokenIndex === tokenIndex);

      if (!isValidMove) {
        return callback?.({ success: false, error: 'Invalid move' });
      }

      const result = handlePlayerMove(io, gameState, roomId, playerIndex, tokenIndex);
      if (result?.winner) {
        return callback?.({ success: true });
      }
      callback?.({ success: true, capturedToken: result?.capturedToken, extraTurn: result?.extraTurn });
    } catch (err) {
      console.error('[moveToken]', err);
      callback?.({ success: false, error: 'Failed to move token' });
    }
  });

  // ── CHAT MESSAGE ─────────────────────────────────────────────────
  socket.on('chatMessage', ({ message }) => {
    const info = getRoomBySocket(socket.id);
    if (!info || !info.gameState) return;
    const player = info.gameState.players[info.playerIndex];
    io.to(info.roomId).emit('chatMessage', {
      playerName: player?.name,
      color: player?.color,
      message: message?.slice(0, 200),
      timestamp: Date.now(),
    });
  });

  // ── DISCONNECT ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const info = getRoomBySocket(socket.id);
    if (!info || !info.gameState) {
      console.log(`[DISCONNECT] ${socket.id} (not in room)`);
      return;
    }

      const { gameState, roomId, playerIndex } = info;
      const player = gameState.players[playerIndex];

      if (player) {
        player.connected = false;
        clearInactivityTimer(roomId);
        player.disconnectedAt = Date.now();
        startOfflineRemovalTimer(io, roomId, playerIndex);
        console.log(`[DISCONNECT] ${player.name} from room ${roomId}`);

        if (gameState.status === 'playing') {
          // If current player disconnects, advance turn
          if (gameState.currentPlayerIndex === playerIndex) {
            nextTurn(gameState);
          }
        broadcastState(io, roomId);
    persistRoom(roomId);
        scheduleBotTurn(io, roomId, BOT_ADVANCE_DELAY_MS);
        io.to(roomId).emit('playerDisconnected', { playerName: player.name, color: player.color });
      }

      // Clean up room if all human players disconnected
      const anyHumanConnected = gameState.players.some((p) => !p.isBot && p.connected);
      const hasBots = gameState.players.some((p) => p.isBot);
      if (!anyHumanConnected && !hasBots) {
        setTimeout(() => {
          const gs = rooms.get(roomId);
          if (gs && !gs.players.some((p) => !p.isBot && p.connected)) {
            rooms.delete(roomId);
            clearBotTimer(roomId);
            console.log(`[CLEANUP] Room ${roomId} removed`);
          }
        }, 60000); // 1 min grace period
      }
    }

    socketToRoom.delete(socket.id);
  });

  // ── GET ROOMS (debug) ────────────────────────────────────────────
  socket.on('getRooms', (callback) => {
    const list = [];
    rooms.forEach((gs, id) => {
      list.push({ roomId: id, players: gs.players.length, status: gs.status });
    });
    callback?.(list);
  });
}

module.exports = { gameHandler };

