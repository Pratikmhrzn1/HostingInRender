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
import { UserDetailStatus } from '@/types';

@Entity('user_details')
export class UserDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index('IDX_user_detail_userId')
  userId: string;

  @OneToOne(() => User, (user: User) => user.userDetail)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb', { nullable: true })
  documents?: {
    idDocument: {
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

  @Column({ type: 'varchar', length: 50, default: UserDetailStatus.PENDING, nullable: false })
  @Index('IDX_user_detail_status')
  status: UserDetailStatus;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'varchar', nullable: true })
  verifiedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
