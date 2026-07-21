import { OrderSide } from '@/modules/exchange/dto/place-order.dto';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('strategy_records')
export class StrategyRecord {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'strategy_name', length: 50 })
  strategyName: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({
    name: 'total_position_size',
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  totalPositionSize: number;

  @Column('tinyint', { default: 0 })
  status: number;

  @Column({ name: 'stop_reason', length: 255, nullable: true })
  stopReason: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column('json', { nullable: true })
  parameters: Record<string, any>;

  @Column({ name: 'last_execution_time', type: 'timestamp', nullable: true })
  lastExecutionTime: Date;

  @Column({ name: 'exchange_config_id' })
  exchangeConfigId: number;

  /**
   * 杠杆，可以为空
   */
  @Column('int', { nullable: true })
  leverage?: number;

  @Column({ name: 'side', type: 'enum', enum: OrderSide, nullable: true })
  side: OrderSide;

  @Column({
    name: 'boundary_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  boundaryPrice?: number;

  @Column({
    name: 'mini_position_size',
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  miniPositionSize?: number;

  @Column({ name: 'config_json', type: 'text', nullable: true })
  configJson?: string;

  @Column({
    name: 'is_trading_strategy',
    type: 'tinyint',
    default: 1,
  })
  isTradingStrategy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
