import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  STRUCTURE_ALERT_TARGET_TYPES,
  StructureAlertTargetType,
} from '../types/structure-alert.types';

@Entity('structure_alert_rules')
export class StructureAlertRule {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'exchange_config_id', type: 'int' })
  exchangeConfigId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    type: 'enum',
    enum: TimeFrame,
  })
  timeframe: TimeFrame;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: STRUCTURE_ALERT_TARGET_TYPES,
  })
  targetType: StructureAlertTargetType;

  @Column({ name: 'target_id', type: 'int' })
  targetId: number;

  @Column({ name: 'monitor_near', type: 'tinyint', default: 1 })
  monitorNear: number;

  @Column({ name: 'monitor_break_up', type: 'tinyint', default: 1 })
  monitorBreakUp: number;

  @Column({ name: 'monitor_break_down', type: 'tinyint', default: 1 })
  monitorBreakDown: number;

  @Column({
    name: 'near_threshold',
    type: 'decimal',
    precision: 12,
    scale: 8,
    nullable: true,
  })
  nearThreshold: number | null;

  @Column({
    name: 'breakout_threshold',
    type: 'decimal',
    precision: 12,
    scale: 8,
    nullable: true,
  })
  breakoutThreshold: number | null;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

