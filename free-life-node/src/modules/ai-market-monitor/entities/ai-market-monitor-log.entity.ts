import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  MonitorCheckInterval,
  MonitorNotifyStatus,
} from '../types/ai-market-monitor.types';

@Entity('ai_market_monitor_logs')
export class AiMarketMonitorLog {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'rule_id', type: 'int' })
  ruleId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    name: 'check_interval',
    type: 'enum',
    enum: MonitorCheckInterval,
  })
  checkInterval: MonitorCheckInterval;

  @Column({ name: 'check_time', type: 'timestamp' })
  checkTime: Date;

  @Column({ type: 'text', nullable: true })
  prompt: string | null;

  @Column({ name: 'ai_response', type: 'text', nullable: true })
  aiResponse: string | null;

  @Column({ type: 'json', nullable: true })
  decision: Record<string, any> | null;

  @Column({ name: 'is_triggered', type: 'tinyint', default: 0 })
  isTriggered: number;

  @Column({ name: 'trigger_reason', type: 'varchar', length: 500, nullable: true })
  triggerReason: string | null;

  @Column({ name: 'notify_status', type: 'varchar', length: 30 })
  notifyStatus: MonitorNotifyStatus;

  @Column({ name: 'notify_error', type: 'text', nullable: true })
  notifyError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
