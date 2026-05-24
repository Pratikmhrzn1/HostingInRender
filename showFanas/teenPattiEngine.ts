import { Deck, BasePlayer, PlayerStatus, rankValue, Card, Suit, Rank } from '../shared/sharedCardsEngine';
export { Suit, Rank, Card, PlayerStatus, Deck };

/**Given below is the ranking of the cards which defines Teen Patti hierarchy:
 * (Strongest to weakest)
 * Trial > PureSequence > Sequence > Color > Pair > HighCard
 * where trial means getting the cards of same number,
 * pure sequence means the sequence of same suit eg:(H1,H2,H3)
 * while sequence means the sequence but not of same suit,
 * Color refers to the three cards with similar suit eg:(H1,H5,H6)
 * Pair means there are two cards among the three of same rank
 * High card is the card with the highest value from the ranking system
 */
export type HandRank =
    | 'Trial'
    | 'PureSequence'
    | 'Sequence'
    | 'Color'
    | 'Pair'
    | 'HighCard';

/**
 * Cards are only included when the caller is allowed to see them.
 */
export type PlayerView = {
    id: number;
    status: PlayerStatus;
    chips: number;
    currentBet: number;
    isSeen: boolean;
    cards?: Card[];
};

/**
 * The full game state snapshot returned by getState.
 * Pass a playerId to viewAs to receive your own cards.
 */
export type GameState = {
    pot: number;
    currentTurn: number;
    gameOver: boolean;
    winner?: number;
    players: PlayerView[];
};

/**
 * A Teen Patti player.
 * Extends BasePlayer (id, chips, cards, status, currentBet, fold())
 * and adds isSeen — whether the player has looked at their cards.
 * Note: AllIn status from the enum is not used in Teen Patti.
 */
export class TeenPattiPlayer extends BasePlayer {
    isSeen = false;

    seeCards(): void {
        this.isSeen = true;
    }
}

/**
 * This class includes the core logic for Teen Patti hand ranking.
 * Uses the shared rankValue map from cardEngine.
 */
export class HandEvaluation {
    static rankOrder: HandRank[] = [
        'HighCard',      // 0
        'Pair',          // 1
        'Color',         // 2
        'Sequence',      // 3
        'PureSequence',  // 4
        'Trial',         // 5
    ];

    static evaluate(cards: Card[]): { rank: HandRank; values: number[] } {
        /**converts cards value to number value */
        const values = cards
            .map(c => rankValue[c.rank])
            /**Sorting to ascending order */
            .sort((a, b) => a - b);

        /**To extract suits from the cards */
        const suits = cards.map(c => c.suit);

        /**It checks if all suits in the hand are same and returns true */
        const isSameSuit = suits.every(s => s === suits[0]);

        /**It checks if the hand is in sequence */
        const isSequence =
            values[2] - values[1] === 1 &&
            values[1] - values[0] === 1;

        /**It creates a frequency map and checks how many times the
         * same rank has appeared
         */
        const counts: Record<number, number> = {};
        values.forEach(v => (counts[v] = (counts[v] || 0) + 1));

        /**extracts frequency of ranks appeared in the hand */
        const freq = Object.values(counts);

        if (freq.includes(3))             return { rank: 'Trial', values };
        if (isSequence && isSameSuit)     return { rank: 'PureSequence', values };
        if (isSequence)                   return { rank: 'Sequence', values };
        if (isSameSuit)                   return { rank: 'Color', values };
        if (freq.includes(2))             return { rank: 'Pair', values };
        return { rank: 'HighCard', values };
    }

    /**Compares two players Hand cards and returns positive if A wins,
     * negative if B wins and 0 if draw */
    static compare(a: Card[], b: Card[]): number {
        const A = this.evaluate(a);
        const B = this.evaluate(b);

        /**If A has a pair and B has just high card then:
         * rankDiff=1(pair index)-0(highcard index)=1
         */
        const rankDiff =
            this.rankOrder.indexOf(A.rank) -
            this.rankOrder.indexOf(B.rank);

        if (rankDiff !== 0) return rankDiff;

        for (let i = 2; i >= 0; i--) {
            if (A.values[i] !== B.values[i]) return A.values[i] - B.values[i];
        }
        return 0;
    }
}


/*
 * This class represents one Teen Patti room where:
 * pot         — total money in the middle (bootAmount + bets)
 * currentTurn — index of whose turn it is
 * bootAmount  — the mandatory entry fee per player
 * minBet      — minimum allowed bet per turn
 * maxPlayers  — 6 (standard Teen Patti table)
 * the game ends when one player remains or showdown() is called
 */
export class TeenPattiGame {
    players: TeenPattiPlayer[] = [];
    deck: Deck;
    pot = 0;
    currentTurn = 0;
    bootAmount: number;
    minBet: number;
    maxPlayers = 6;
    gameOver = false;
    private winnerId?: number;

    constructor(
        playerIds: number[],
        startingChips = 100,
        bootAmount = 10,
        minBet = 10,
    ) {
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
        this.deck = new Deck();
        this.deck.shuffle();

        /*
         * Register players and collect boot from each player:
         * 1. Create player
         * 2. Deduct boot amount
         * 3. Add boot to pot
         * 4. Sit them at the table
         */
        for (const id of playerIds) {
            const player = new TeenPattiPlayer(id, startingChips, PlayerStatus.Active);
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
    private dealCards(): void {
        for (let i = 0; i < 3; i++) {
            this.players.forEach(p => p.cards.push(this.deck.draw()));
        }
    }

    seeCards(playerId: number): void {
        this.getPlayer(playerId).seeCards();
    }

    /*
     * Ensures it is the player's turn, validates chip amount,
     * deducts chips, increases currentBet and pot, then advances the turn
     */
    placeBet(playerId: number, amount: number): void {
        this.ensureTurn(playerId);
        const player = this.getPlayer(playerId);
        if (amount < this.minBet)   throw new Error('Amount too low for betting');
        if (player.chips < amount)  throw new Error('Insufficient chips');
        player.chips -= amount;
        player.currentBet += amount;
        this.pot += amount;
        this.nextTurn();
    }

    fold(playerId: number): void {
        this.ensureTurn(playerId);
        this.getPlayer(playerId).fold();
        this.nextTurn();
    }

    showdown(): TeenPattiPlayer {
        const active = this.activePlayers();
        let winner = active[0];
        for (const p of active) {
            if (HandEvaluation.compare(p.cards, winner.cards) > 0) winner = p;
        }
        this.resolveWinner(winner);
        return winner;
    }

    private nextTurn(): void {
        if (this.activePlayers().length === 1) {
            this.resolveWinner(this.activePlayers()[0]);
            return;
        }
        do {
            this.currentTurn = (this.currentTurn + 1) % this.players.length;
        } while (this.players[this.currentTurn].status !== PlayerStatus.Active);
    }

    /** Awards the pot to the winner and marks the game as over */
    private resolveWinner(winner: TeenPattiPlayer): void {
        winner.chips += this.pot;
        this.winnerId = winner.id;
        this.gameOver = true;
    }

    /*
     * To get the players through their id
     */
    private getPlayer(id: number): TeenPattiPlayer {
        const p = this.players.find(p => p.id === id);
        if (!p) throw new Error('Invalid player id');
        return p;
    }

    /*
     * To make sure it is the player's turn
     */
    private ensureTurn(playerId: number): void {
        if (this.gameOver) 
          throw new Error('Game is already over');
        if (this.players[this.currentTurn].id !== playerId) {
            throw new Error('Not your turn');
        }
    }

    /*
     * Returns only players whose status is Active
     */
    private activePlayers(): TeenPattiPlayer[] {
        return this.players.filter(p => p.status === PlayerStatus.Active);
    }

    /**
     * Returns a sanitised snapshot of the game.
     * Pass viewAs to include that player's own cards in the response.
     */
    getState(viewAs?: number): GameState {
        return {
            pot: this.pot,
            currentTurn: this.players[this.currentTurn].id,
            gameOver: this.gameOver,
            winner: this.winnerId,
            players: this.players.map(p => ({
                id: p.id,
                status: p.status,
                chips: p.chips,
                currentBet: p.currentBet,
                isSeen: p.isSeen,
                // Only expose cards to the player who owns them
                ...(viewAs === p.id ? { cards: p.cards } : {}),
            })),
        };
    }
}

export default TeenPattiGame;