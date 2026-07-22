import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActiveSpotEmaSourceMode {
  UP = 'UP',
  RANGE = 'RANGE',
}

export enum ActiveSpotEmaTradeStatus {
  PENDING_BUY = 'PENDING_BUY',
  HOLDING = 'HOLDING',
  PENDING_SELL = 'PENDING_SELL',
}

@Entity('active_spot_ema_trades')
@Index(
  'uk_active_spot_ema_signal',
  ['strategyRecordId', 'sourceMode', 'signalKlineTime'],
  { unique: true },
)
@Index('uk_active_spot_ema_order', ['exchangeConfigId', 'orderId'], {
  unique: true,
})
@Index('idx_active_spot_ema_strategy_status', [
  'strategyRecordId',
  'tradeStatus',
])
@Index('idx_active_spot_ema_context', ['userId', 'exchangeConfigId', 'symbol'])
@Index('idx_active_spot_ema_take_profit', [
  'strategyRecordId',
  'tradeStatus',
  'takeProfitPrice',
])
export class ActiveSpotEmaTrade {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'strategy_record_id', type: 'int' })
  strategyRecordId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'exchange_config_id', type: 'int' })
  exchangeConfigId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    name: 'source_mode',
    type: 'enum',
    enum: ActiveSpotEmaSourceMode,
    nullable: true,
  })
  sourceMode: ActiveSpotEmaSourceMode | null;

  @Column({
    name: 'signal_timeframe',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  signalTimeframe: string | null;

  @Column({ name: 'ema_period', type: 'int', nullable: true })
  emaPeriod: number | null;

  @Column({ name: 'signal_kline_time', type: 'bigint', nullable: true })
  signalKlineTime: number | null;

  @Column({ name: 'entry_price', type: 'decimal', precision: 20, scale: 8 })
  entryPrice: number;

  @Column({
    name: 'take_profit_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  takeProfitPrice: number;

  @Column({ name: 'trade_amount', type: 'decimal', precision: 20, scale: 8 })
  tradeAmount: number;

  @Column({ name: 'position_cost', type: 'decimal', precision: 20, scale: 8 })
  positionCost: number;

  @Column({
    name: 'trade_status',
    type: 'enum',
    enum: ActiveSpotEmaTradeStatus,
  })
  tradeStatus: ActiveSpotEmaTradeStatus;

  @Column({ name: 'order_id', type: 'varchar', length: 100, nullable: true })
  orderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
