import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  STRATEGY_BOUNDARIES,
  STRATEGY_LEVEL_GROUPS,
  StrategyBoundary,
  StrategyLevelGroup,
} from '../constants/strategy-structure.constants';

@Entity('strategy_key_levels')
export class StrategyKeyLevel {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 20 })
  timeframe: string;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  price: number;

  @Column({
    name: 'level_group',
    type: 'enum',
    enum: STRATEGY_LEVEL_GROUPS,
  })
  levelGroup: StrategyLevelGroup;

  @Column({
    type: 'enum',
    enum: STRATEGY_BOUNDARIES,
    nullable: true,
  })
  boundary: StrategyBoundary | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
