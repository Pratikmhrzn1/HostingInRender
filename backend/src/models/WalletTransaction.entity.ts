
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { Wallet } from './Wallet.entity';
import { WalletLoadRequest } from './WalletLoadRequest.entity';
export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionSource {
  WALLET_LOAD = 'WALLET_LOAD',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
  PURCHASE = 'PURCHASE',
  WITHDRAWAL = 'WITHDRAWAL',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Entity('wallet_transactions')
@Index(['walletId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  walletId: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionSource,
  })
  source: TransactionSource;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceBefore: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  loadRequestId: string;

  @ManyToOne(() => WalletLoadRequest)
  @JoinColumn({ name: 'loadRequestId' })
  loadRequest: WalletLoadRequest;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  metadata: string; // JSON string for additional data

  @CreateDateColumn()
  createdAt: Date;
}