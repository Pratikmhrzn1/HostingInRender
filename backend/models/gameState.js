// models/gameState.js
// Complete Ludo board logic and state management

const BOARD_SIZE = 52; // Total path squares
const TOKENS_PER_PLAYER = 4;
const HOME_STRETCH_LENGTH = 5;

// Board path positions for each color (global path indices 0-51)
// Each color enters the board at a different point
const COLOR_START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Safe squares on global path (star squares)
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home stretch entry: after which global path square does a token enter home stretch
const HOME_ENTRY = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
};

function createToken(colorIndex, tokenIndex) {
  return {
    id: `${tokenIndex}`,
    position: -1,       // -1 = in base, 0-51 = main path, 52-56 = home stretch, 200 = home
    globalPos: -1,      // actual global board position (0-51)
    homeStretchPos: -1, // 0-5 in home stretch, -1 if not there
    isHome: false,
    isBase: true,
    isSafe: false,
  };
}

function createPlayer(socketId, name, color, colorIndex, options = {}) {
  const {
    isBot = false,
    bidPoints = null,
    userId = null,
    pointsSnapshot = 0,
    autoPlay = false,
    autoBotReason = null,
  } = options;
  return {
    socketId,
    name,
    color,
    colorIndex,
    tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, i) => createToken(colorIndex, i)),
    tokensHome: 0,
    connected: true,
    isBot,
    bidPoints,
    committedPoints: 0,
    pointsSnapshot,
    lastActiveAt: Date.now(),
    autoPlay,
    autoBotReason,
    disconnectedAt: null,
    finishedAt: null,
    removed: false,
    userId,
  };
}

function createGameState(roomId) {
  return {
    roomId,
    players: [],       // array of player objects
    status: 'waiting', // waiting | playing | finished
    currentPlayerIndex: 0,
    diceValue: null,
    diceRolled: false,
    hasValidMove: false,
    winner: null,
    turnCount: 0,
    lastAction: null,
    maxPlayers: 4,
    bidPot: 0,
    biddingComplete: false,
  };
}

// Convert a player's local path position (0-51) to global board position
function localToGlobal(localPos, color) {
  const offset = COLOR_START_OFFSETS[color];
  return (localPos + offset) % BOARD_SIZE;
}

// Convert global board position to player's local path position
function globalToLocal(globalPos, color) {
  const offset = COLOR_START_OFFSETS[color];
  return ((globalPos - offset) + BOARD_SIZE) % BOARD_SIZE;
}

// Get a token's local path position (0-51), or -1 if in base/home
function getTokenLocalPos(token) {
  if (token.isBase || token.isHome) return -1;
  if (token.homeStretchPos >= 0) return 52 + token.homeStretchPos; // 52-56 for home stretch
  return token.position; // local 0-51
}

// Check if a position is safe for a given color
function isSafePosition(globalPos, color) {
  if (SAFE_SQUARES.has(globalPos)) return true;
  // Start squares are also safe
  const startGlobal = COLOR_START_OFFSETS[color];
  if (globalPos === startGlobal) return true;
  return false;
}

// Get all tokens that can be moved given dice value
function getMovableTokens(player, diceValue, allPlayers) {
  const movable = [];

  player.tokens.forEach((token, idx) => {
    if (token.isHome) return;

    if (token.isBase) {
      // Can only exit with a 6
      if (diceValue === 6) {
        movable.push({ tokenIndex: idx, action: 'exit' });
      }
      return;
    }

    // Token is on path
    const currentLocal = token.homeStretchPos >= 0
      ? 52 + token.homeStretchPos
      : token.position;

    const newLocal = currentLocal + diceValue;

    if (token.homeStretchPos >= 0) {
      // In home stretch
      const newStretchPos = token.homeStretchPos + diceValue;
      if (newStretchPos === HOME_STRETCH_LENGTH) {
        movable.push({ tokenIndex: idx, action: 'home' });
      } else if (newStretchPos < HOME_STRETCH_LENGTH) {
        movable.push({ tokenIndex: idx, action: 'moveStretch' });
      }
      // newStretchPos > HOME_STRETCH_LENGTH means can't move
    } else {
      // On main path (local 0-51)
      const localPos = token.position;
      const newPos = localPos + diceValue;
      const entryLocal = globalToLocal(HOME_ENTRY[player.color], player.color);

      // Check if crossing home entry
      if (localPos <= entryLocal && newPos > entryLocal) {
        const overflow = newPos - entryLocal - 1;
        if (overflow === HOME_STRETCH_LENGTH) {
          movable.push({ tokenIndex: idx, action: 'home' });
        } else if (overflow < HOME_STRETCH_LENGTH) {
          movable.push({ tokenIndex: idx, action: 'enterStretch' });
        }
      } else if (newPos < BOARD_SIZE) {
        movable.push({ tokenIndex: idx, action: 'move' });
      } else {
        // Would wrap around
        const wrappedLocal = newPos % BOARD_SIZE;
        movable.push({ tokenIndex: idx, action: 'move' });
      }
    }
  });

  return movable;
}

// Apply a move to the game state
function applyMove(gameState, playerIndex, tokenIndex, diceValue) {
  const player = gameState.players[playerIndex];
  const token = player.tokens[tokenIndex];
  let capturedToken = null;
  let extraTurn = diceValue === 6;

  if (token.isBase) {
    // Exit base
    const startGlobal = COLOR_START_OFFSETS[player.color];
    token.isBase = false;
    token.position = 0; // local position 0 = start
    token.globalPos = startGlobal;
    token.isSafe = true;
  } else if (token.homeStretchPos >= 0) {
    // Move in home stretch
    const newStretchPos = token.homeStretchPos + diceValue;
    if (newStretchPos === HOME_STRETCH_LENGTH) {
      token.homeStretchPos = -1;
      token.isHome = true;
      token.position = 200;
      player.tokensHome += 1;
      extraTurn = true; // Extra turn for reaching home
      if (player.tokensHome === TOKENS_PER_PLAYER && !player.finishedAt) {
        player.finishedAt = Date.now();
      }
    } else {
      token.homeStretchPos = newStretchPos;
      token.position = 52 + newStretchPos;
      token.globalPos = -1;
      token.isSafe = true;
    }
  } else {
    // Move on main path
    const localPos = token.position;
    const entryLocal = globalToLocal(HOME_ENTRY[player.color], player.color);
    const newLocalPos = localPos + diceValue;

    if (localPos <= entryLocal && newLocalPos > entryLocal) {
      // Enter home stretch
      const stretchPos = newLocalPos - entryLocal - 1;
      if (stretchPos === HOME_STRETCH_LENGTH) {
        token.isHome = true;
        token.position = 200;
        token.homeStretchPos = -1;
        player.tokensHome += 1;
        extraTurn = true;
        if (player.tokensHome === TOKENS_PER_PLAYER && !player.finishedAt) {
          player.finishedAt = Date.now();
        }
      } else {
        token.position = 52 + stretchPos;
        token.globalPos = -1;
        token.homeStretchPos = stretchPos;
        token.isSafe = true;
      }
    } else {
      // Normal move on path
      const wrappedLocal = newLocalPos % BOARD_SIZE;
      const newGlobal = localToGlobal(wrappedLocal, player.color);
      token.position = wrappedLocal;
      token.globalPos = newGlobal;
      token.isSafe = isSafePosition(newGlobal, player.color);

      // Check for capture
      if (!token.isSafe) {
        gameState.players.forEach((otherPlayer, pi) => {
          if (pi === playerIndex) return;
          otherPlayer.tokens.forEach((otherToken) => {
            if (otherToken.isBase || otherToken.isHome || otherToken.homeStretchPos >= 0) return;
            if (otherToken.globalPos === newGlobal) {
              // Capture!
              otherToken.isBase = true;
              otherToken.position = -1;
              otherToken.globalPos = -1;
              otherToken.isSafe = false;
              capturedToken = { player: otherPlayer.color, tokenId: otherToken.id };
              extraTurn = true; // Extra turn for capture
            }
          });
        });
      }
    }
  }

  return { capturedToken, extraTurn };
}

// Check win condition
function checkWinner(gameState) {
  for (const player of gameState.players) {
    if (player.tokensHome === TOKENS_PER_PLAYER) {
      return player;
    }
  }
  return null;
}

// Advance to next player's turn
function nextTurn(gameState) {
  const players = gameState.players;
  const numPlayers = players.length;
  let next = (gameState.currentPlayerIndex + 1) % numPlayers;

  // Skip disconnected players
  let attempts = 0;
  while ((players[next].removed || !players[next].connected) && attempts < numPlayers) {
    next = (next + 1) % numPlayers;
    attempts++;
  }

  if (attempts >= numPlayers) {
    gameState.currentPlayerIndex = 0;
  } else {
    gameState.currentPlayerIndex = next;
  }
  gameState.diceValue = null;
  gameState.diceRolled = false;
  gameState.hasValidMove = false;
  gameState.turnCount += 1;
}

// Serialize state for sending to clients
function serializeState(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}

module.exports = {
  createGameState,
  createPlayer,
  getMovableTokens,
  applyMove,
  checkWinner,
  nextTurn,
  serializeState,
  COLOR_START_OFFSETS,
  SAFE_SQUARES,
  HOME_ENTRY,
  BOARD_SIZE,
};
