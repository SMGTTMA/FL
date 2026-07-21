import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('active_spot_martin_trades')
export class ActiveSpotMartinTrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_name', type: 'varchar', length: 50 })
  strategyName: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    name: 'entry_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  entryPrice: number;

  @Column({
    name: 'take_profit_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  takeProfitPrice: number;

  @Column({ name: 'trade_amount', type: 'decimal', precision: 20, scale: 8 })
  tradeAmount: number;

  @Column({ type: 'enum', enum: ['buy', 'sell'] })
  side: 'buy' | 'sell';

  @Column({ name: 'is_price_deviated', type: 'tinyint', default: 0 })
  isPriceDeviated: boolean;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'exchange_config_id' })
  exchangeConfigId: number;

  @Column({ name: 'order_id', type: 'varchar', length: 100, nullable: true })
  orderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
