
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('admin_notifications')
export class AdminNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'wallet_load_request', 'new_user', etc.

  @Column()
  relatedEntityId: string; // ID of the related entity (e.g., load request ID)

  @Column('text')
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readBy: string;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}