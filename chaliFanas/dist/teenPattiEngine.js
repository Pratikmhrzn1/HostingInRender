"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeenPattiGame = exports.HandEvaluation = exports.TeenPattiPlayer = exports.Deck = exports.PlayerStatus = void 0;
const sharedCardsEngine_1 = require("./shared/sharedCardsEngine");
Object.defineProperty(exports, "Deck", { enumerable: true, get: function () { return sharedCardsEngine_1.Deck; } });
Object.defineProperty(exports, "PlayerStatus", { enumerable: true, get: function () { return sharedCardsEngine_1.PlayerStatus; } });
/**
 * A Teen Patti player.
 * Extends BasePlayer (id, chips, cards, status, currentBet, fold())
 * and adds isSeen — whether the player has looked at their cards.
 * Note: AllIn status from the enum is not used in Teen Patti.
 */
class TeenPattiPlayer extends sharedCardsEngine_1.BasePlayer {
    constructor() {
        super(...arguments);
        this.isSeen = false;
    }
    seeCards() {
        this.isSeen = true;
    }
}
exports.TeenPattiPlayer = TeenPattiPlayer;
/**
 * This class includes the core logic for Teen Patti hand ranking.
 * Uses the shared rankValue map from cardEngine.
 */
class HandEvaluation {
    static evaluate(cards) {
        /**converts cards value to number value */
        const values = cards
            .map(c => sharedCardsEngine_1.rankValue[c.rank])
            /**Sorting to ascending order */
            .sort((a, b) => a - b);
        /**To extract suits from the cards */
        const suits = cards.map(c => c.suit);
        /**It checks if all suits in the hand are same and returns true */
        const isSameSuit = suits.every(s => s === suits[0]);
        /**It checks if the hand is in sequence */
        const isSequence = values[2] - values[1] === 1 &&
            values[1] - values[0] === 1;
        /**It creates a frequency map and checks how many times the
         * same rank has appeared
         */
        const counts = {};
        values.forEach(v => (counts[v] = (counts[v] || 0) + 1));
        /**extracts frequency of ranks appeared in the hand */
        const freq = Object.values(counts);
        if (freq.includes(3))
            return { rank: 'Trial', values };
        if (isSequence && isSameSuit)
            return { rank: 'PureSequence', values };
        if (isSequence)
            return { rank: 'Sequence', values };
        if (isSameSuit)
            return { rank: 'Color', values };
        if (freq.includes(2))
            return { rank: 'Pair', values };
        return { rank: 'HighCard', values };
    }
    /**Compares two players Hand cards and returns positive if A wins,
     * negative if B wins and 0 if draw */
    static compare(a, b) {
        const A = this.evaluate(a);
        const B = this.evaluate(b);
        /**If A has a pair and B has just high card then:
         * rankDiff=1(pair index)-0(highcard index)=1
         */
        const rankDiff = this.rankOrder.indexOf(A.rank) -
            this.rankOrder.indexOf(B.rank);
        if (rankDiff !== 0)
            return rankDiff;
        for (let i = 2; i >= 0; i--) {
            if (A.values[i] !== B.values[i])
                return A.values[i] - B.values[i];
        }
        return 0;
    }
}
exports.HandEvaluation = HandEvaluation;
HandEvaluation.rankOrder = [
    'HighCard', // 0
    'Pair', // 1
    'Color', // 2
    'Sequence', // 3
    'PureSequence', // 4
    'Trial', // 5
];
/*
 * This class represents one Teen Patti room where:
 * pot         — total money in the middle (bootAmount + bets)
 * currentTurn — index of whose turn it is
 * bootAmount  — the mandatory entry fee per player
 * minBet      — minimum allowed bet per turn
 * maxPlayers  — 6 (standard Teen Patti table)
 * the game ends when one player remains or showdown() is called
 */
class TeenPattiGame {
    constructor(playerIds, startingChips = 100, bootAmount = 10, minBet = 10) {
        this.players = [];
        this.pot = 0;
        this.currentTurn = 0;
        this.maxPlayers = 6;
        this.gameOver = false;
        /*
         * It checks whether the number of the players is below 2 or above 6
         * which results in an error
         */
        if (playerIds.length < 2 || playerIds.length > this.maxPlayers) {
            throw new Error('Invalid player count');
        }
        this.bootAmount = bootAmount;
        this.minBet = minBet;
        /*
         * Deck comes from the shared cardEngine — no need to redefine it
         */
        this.deck = new sharedCardsEngine_1.Deck();
        this.deck.shuffle();
        /*
         * Register players and collect boot from each player:
         * 1. Create player
         * 2. Deduct boot amount
         * 3. Add boot to pot
         * 4. Sit them at the table
         */
        for (const id of playerIds) {
            const player = new TeenPattiPlayer(id, startingChips, sharedCardsEngine_1.PlayerStatus.Active);
            player.chips -= bootAmount;
            player.currentBet = bootAmount;
            this.pot += bootAmount;
            this.players.push(player);
        }
        /*Enables dealing of cards*/
        this.dealCards();
    }
    /*
     * Deal 3 cards to each player, one card per player per pass
     */
    dealCards() {
        for (let i = 0; i < 3; i++) {
            this.players.forEach(p => p.cards.push(this.deck.draw()));
        }
    }
    seeCards(playerId) {
        this.getPlayer(playerId).seeCards();
    }
    /*
     * Ensures it is the player's turn, validates chip amount,
     * deducts chips, increases currentBet and pot, then advances the turn
     */
    placeBet(playerId, amount) {
        this.ensureTurn(playerId);
        const player = this.getPlayer(playerId);
        if (amount < this.minBet)
            throw new Error('Amount too low for betting');
        if (player.chips < amount)
            throw new Error('Insufficient chips');
        player.chips -= amount;
        player.currentBet += amount;
        this.pot += amount;
        this.nextTurn();
    }
    fold(playerId) {
        this.ensureTurn(playerId);
        this.getPlayer(playerId).fold();
        this.nextTurn();
    }
    showdown() {
        const active = this.activePlayers();
        let winner = active[0];
        for (const p of active) {
            if (HandEvaluation.compare(p.cards, winner.cards) > 0)
                winner = p;
        }
        this.resolveWinner(winner);
        return winner;
    }
    nextTurn() {
        if (this.activePlayers().length === 1) {
            this.resolveWinner(this.activePlayers()[0]);
            return;
        }
        do {
            this.currentTurn = (this.currentTurn + 1) % this.players.length;
        } while (this.players[this.currentTurn].status !== sharedCardsEngine_1.PlayerStatus.Active);
    }
    /** Awards the pot to the winner and marks the game as over */
    resolveWinner(winner) {
        winner.chips += this.pot;
        this.winnerId = winner.id;
        this.gameOver = true;
    }
    /*
     * To get the players through their id
     */
    getPlayer(id) {
        const p = this.players.find(p => p.id === id);
        if (!p)
            throw new Error('Invalid player id');
        return p;
    }
    /*
     * To make sure it is the player's turn
     */
    ensureTurn(playerId) {
        if (this.gameOver)
            throw new Error('Game is already over');
        if (this.players[this.currentTurn].id !== playerId) {
            throw new Error('Not your turn');
        }
    }
    /*
     * Returns only players whose status is Active
     */
    activePlayers() {
        return this.players.filter(p => p.status === sharedCardsEngine_1.PlayerStatus.Active);
    }
    /**
     * Returns a sanitised snapshot of the game.
     * Pass viewAs to include that player's own cards in the response.
     */
    getState(viewAs) {
        return {
            pot: this.pot,
            currentTurn: this.players[this.currentTurn].id,
            gameOver: this.gameOver,
            winner: this.winnerId,
            players: this.players.map(p => (Object.assign({ id: p.id, status: p.status, chips: p.chips, currentBet: p.currentBet, isSeen: p.isSeen }, (viewAs === p.id ? { cards: p.cards } : {})))),
        };
    }
}
exports.TeenPattiGame = TeenPattiGame;
exports.default = TeenPattiGame;
