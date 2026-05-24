import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GameHistory } from './GameHistory.entity';
import { GameType, RoomType, GamePhase } from '@/types';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  gameType: GameType;

  @Column({ unique: true })
  @Index()
  tableId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  roomType: RoomType;

  @Column('decimal', { precision: 10, scale: 2 })
  bootAmount: number;

  @Column()
  maxPlayers: number;

  @Column('jsonb')
  currentPlayers: Array<{
    userId: string;
    seatNumber: number;
    chips: number;
    status: string;
  }>;

  @Column('jsonb')
  gameState: {
    phase: GamePhase;
    pot: number;
    currentTurn: number;
    cards: Record<string, string>;
    communityCards?: string[];
    actions: Array<{
      userId: string;
      action: string;
      amount: number;
      timestamp: Date;
    }>;
  };

  @Column('jsonb', { nullable: true })
  result?: {
    winner: string;
    winningHand: string;
    prize: number;
    rake: number;
  };

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  endedAt?: Date;

  @OneToMany(() => GameHistory, (history) => history.game)
  histories: GameHistory[];

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
