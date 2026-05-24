/**
 * This engine contains all the primitives that are common across card games:
 * suits, ranks, cards,rankValue,Deck,PlayerStatus, Player
 * we can use them for almost every card game
 */

/**Card System:
 * There are 4 suits in a standard deck
 * There are 13 cards ranking from 2 to A ,the higher the index the greater the value
 */
export type Suit = 'Clubs' | 'Diamonds' | 'Hearts' | 'Spades';
export type Rank =
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | 'J'
    | 'Q'
    | 'K'
    | 'A';
export type Card = {
    suit: Suit;
    rank: Rank;
};

/**
 * Numeric value map for every rank.
 */
export const rankValue: Record<Rank, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10':10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
};

/**
 * Deck
 */

export class Deck {
    private cards: Card[] = [];
    constructor() {
        const suits: Suit[] = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
        const ranks: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A',];
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
    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    /**
     *Draw a top card. Throws if the deck is empty.
     *Used by both Teen patti(hole cards) and poker(hole+community)
     */
    draw(): Card {
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
    burn(): void {
        if (this.cards.length === 0) throw new Error('Deck is empty!');
        this.cards.pop();
    }
    /**
     * Get the remaining cards from the deck
     */
    get remaining(): number {
        return this.cards.length;
    }
}
/**
 * Base player status
 * Active:player is still in the round
 * Folded:player has quit this round
 */
export enum PlayerStatus{
    Active = 1,
    Folded = 2,
    AllIn = 3
}
/**
 *  BasePlayer
 * Generic base class for a player in any card game
 * Contains all fields and methods identical across games;
 * id,chips,cards,status,currentBet,fold(),isActive,isFolded
 * 
 * Game-specific players extend this and add their own
 * fields and methods on top
 */
export abstract class BasePlayer{
    id:number;
    chips:number;
    cards:Card[]=[];
    status:PlayerStatus = PlayerStatus.Active;
    currentBet=0;
    constructor(id:number,chips:number,initialStatus:PlayerStatus = PlayerStatus.Active){
        this.id=id;
        this.chips=chips;
        this.status=initialStatus;
    }
    fold():void{
        this.status = PlayerStatus.Folded;
    }
    get isActive():boolean{
        return this.status === PlayerStatus.Active;
    }
    get isFolded():boolean{
        return this.status === PlayerStatus.Folded;
    }
}
