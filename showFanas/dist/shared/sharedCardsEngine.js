"use strict";
/**
 * This engine contains all the primitives that are common across card games:
 * suits, ranks, cards,rankValue,Deck,PlayerStatus, Player
 * we can use them for almost every card game
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlayer = exports.PlayerStatus = exports.Deck = exports.rankValue = void 0;
/**
 * Numeric value map for every rank.
 */
exports.rankValue = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
};
/**
 * Deck
 */
class Deck {
    constructor() {
        this.cards = [];
        const suits = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',];
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push({ suit, rank });
            }
        }
    }
    /**Fisher-Yates Shuffle method:
     * For production, we gotta replace Math.random with cryto.randomInt(0,i+1);
     * The reason to use it is cuz the Math.random isn't cryptographically secure.
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    /**
     *Draw a top card. Throws if the deck is empty.
     *Used by both Teen patti(hole cards) and poker(hole+community)
     */
    draw() {
        const card = this.cards.pop();
        if (!card) {
            throw new Error('Deck is empty!');
        }
        return card;
    }
    /**
     * Burn the top card without returning it .
     *
     */
    burn() {
        if (this.cards.length === 0)
            throw new Error('Deck is empty!');
        this.cards.pop();
    }
    /**
     * Get the remaining cards from the deck
     */
    get remaining() {
        return this.cards.length;
    }
}
exports.Deck = Deck;
/**
 * Base player status
 * Active:player is still in the round
 * Folded:player has quit this round
 */
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus[PlayerStatus["Active"] = 1] = "Active";
    PlayerStatus[PlayerStatus["Folded"] = 2] = "Folded";
    PlayerStatus[PlayerStatus["AllIn"] = 3] = "AllIn";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
/**
 *  BasePlayer
 * Generic base class for a player in any card game
 * Contains all fields and methods identical across games;
 * id,chips,cards,status,currentBet,fold(),isActive,isFolded
 *
 * Game-specific players extend this and add their own
 * fields and methods on top
 */
class BasePlayer {
    constructor(id, chips, initialStatus = PlayerStatus.Active) {
        this.cards = [];
        this.status = PlayerStatus.Active;
        this.currentBet = 0;
        this.id = id;
        this.chips = chips;
        this.status = initialStatus;
    }
    fold() {
        this.status = PlayerStatus.Folded;
    }
    get isActive() {
        return this.status === PlayerStatus.Active;
    }
    get isFolded() {
        return this.status === PlayerStatus.Folded;
    }
}
exports.BasePlayer = BasePlayer;
