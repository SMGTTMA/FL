import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  STRATEGY_MARKET_DIRECTIONS,
  StrategyMarketDirectionType,
} from '../constants/strategy-structure.constants';

@Entity('strategy_market_directions')
export class StrategyMarketDirection {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 20 })
  timeframe: string;

  @Column({
    type: 'enum',
    enum: STRATEGY_MARKET_DIRECTIONS,
  })
  direction: StrategyMarketDirectionType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
