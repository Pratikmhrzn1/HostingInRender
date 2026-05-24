import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { Game } from './Game.entity';
import {
  TransactionType,
  TransactionCategory,
  TransactionStatus,
} from '@/types';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: TransactionType;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  category: TransactionCategory;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  balanceBefore?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  balanceAfter?: number;

  @Column({ type: 'varchar', length: 50, default: TransactionStatus.PENDING })
  @Index()
  status: TransactionStatus;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ nullable: true })
  paymentGatewayId?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  gameId?: string;

  @ManyToOne(() => Game, { nullable: true })
  @JoinColumn({ name: 'gameId' })
  game?: Game;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
