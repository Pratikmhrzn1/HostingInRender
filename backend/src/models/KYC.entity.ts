import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { KYCStatus } from '@/types';

@Entity('kyc')
export class KYC {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, (user: User) => user.kyc)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb', { nullable: true })
  documents?: {
    citizenship: {
      front: string;
      back: string;
      number: string;
    };
    pan: {
      image: string;
      number: string;
    };
    selfie: string;
  };

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  @Index()
  status: KYCStatus;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  verifiedBy?: string;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column({ nullable: true })
  submittedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

