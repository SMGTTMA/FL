import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  @Index('idx_id')
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ name: 'password', length: 255 })
  password: string;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @Column({ name: 'login_failed_count', type: 'int', default: 0, comment: '连续登录失败次数' })
  loginFailedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}