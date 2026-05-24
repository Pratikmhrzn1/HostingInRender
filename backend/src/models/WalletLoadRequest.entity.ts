
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
import { Wallet } from './Wallet.entity';
export enum LoadRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  OTHER = 'OTHER',
}

@Entity('wallet_load_requests')
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class WalletLoadRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  walletId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Wallet, (wallet) => wallet.loadRequests)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  transactionReference: string;

  @Column('text', { nullable: true })
  userNote: string;

  // Screenshot/proof of payment
  @Column({ nullable: true })
  proofImageUrl: string;

  @Column({
    type: 'enum',
    enum: LoadRequestStatus,
    default: LoadRequestStatus.PENDING,
  })
  @Index()
  status: LoadRequestStatus;

  // Admin action details
  @Column({ nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column('text', { nullable: true })
  adminRemark?: string;

  @Column('text', { nullable: true })
  rejectionReason: string;

  // Resubmission tracking
  @Column({ default: 0 })
  resubmissionCount: number;

  @Column({ nullable: true })
  originalRequestId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}