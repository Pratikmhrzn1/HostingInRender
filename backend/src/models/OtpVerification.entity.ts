import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otp_verifications')
export class OtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  phone: string;

  @Column()
  otp: string; // hashed OTP

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
