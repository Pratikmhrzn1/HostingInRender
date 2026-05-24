import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Game } from './Game.entity';
import { GameType } from '@/types';

@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  gameId: string;

  @ManyToOne(() => Game, (game: Game) => game.histories)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  gameType: GameType;

  @Column('jsonb')
  players: Array<{
    userId: string;
    seatNumber: number;
    cards: string[];
    handRank: string;
    chipsIn: number;
    chipsOut: number;
    result: string;
  }>;

  @Column('decimal', { precision: 10, scale: 2 })
  pot: number;

  @Column('decimal', { precision: 10, scale: 2 })
  rake: number;

  @Column()
  @Index()
  winner: string;

  @Column('jsonb')
  actions: Array<Record<string, any>>;

  @Column()
  startedAt: Date;

  @Column()
  endedAt: Date;

  @Column()
  duration: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
