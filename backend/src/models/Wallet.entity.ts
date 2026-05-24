import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { WalletLoadRequest } from './WalletLoadRequest.entity';
import { WalletTransaction } from './WalletTransaction.entity';


@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  bonusBalance: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  lockedAmount: number;

  @Column({ default: 'USD' })
  currency: string;

  @OneToMany(() => WalletLoadRequest, (request) => request.wallet)
  loadRequests: WalletLoadRequest[];

  @OneToMany(() => WalletTransaction, (transaction) => transaction.wallet)
  transactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

