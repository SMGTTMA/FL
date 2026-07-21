import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MonitorCheckInterval } from '../types/ai-market-monitor.types';

@Entity('ai_market_monitor_rules')
export class AiMarketMonitorRule {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'exchange_config_id', type: 'int' })
  exchangeConfigId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'text' })
  instruction: string;

  @Column({
    name: 'check_interval',
    type: 'enum',
    enum: MonitorCheckInterval,
    default: MonitorCheckInterval.H1,
  })
  checkInterval: MonitorCheckInterval;

  @Column({ name: 'kline_window', type: 'int', default: 24 })
  klineWindow: number;

  @Column({ name: 'repeat_monitor', type: 'tinyint', default: 0 })
  repeatMonitor: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'last_check_at', type: 'timestamp', nullable: true })
  lastCheckAt: Date | null;

  @Column({ name: 'last_trigger_at', type: 'timestamp', nullable: true })
  lastTriggerAt: Date | null;

  @Column({ name: 'last_ai_response', type: 'text', nullable: true })
  lastAiResponse: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
