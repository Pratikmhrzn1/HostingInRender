import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Wallet } from './Wallet.entity';
import { Transaction } from './Transaction.entity';
import { UserDetail } from './UserDetail.entity';
import { UserStatus, UserRole } from '@/types';
import { KYC } from './KYC.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isUserDetailVerified: boolean;

  @Column('jsonb', { nullable: true })
  deviceInfo?: {
    deviceId: string;
    deviceType: string;
    ipAddress: string;
    lastLoginAt: Date;
  };

  @Column({ type: 'varchar', length: 50, default: UserStatus.ACTIVE })
  @Index()
  status: UserStatus;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @Column({ type: 'varchar', length: 20, default: UserRole.USER })
  role: UserRole;

  @OneToOne(() => UserDetail, (userDetail) => userDetail.user)
  userDetail: UserDetail;

   @OneToOne(() => KYC, (kyc) => kyc.user)
  kyc: KYC;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

