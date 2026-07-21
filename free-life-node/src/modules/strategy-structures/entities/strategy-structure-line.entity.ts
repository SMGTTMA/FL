import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  STRATEGY_BOUNDARIES,
  STRATEGY_LINE_GROUPS,
  StrategyBoundary,
  StrategyLineGroup,
} from '../constants/strategy-structure.constants';

@Entity('strategy_structure_lines')
export class StrategyStructureLine {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 20 })
  timeframe: string;

  @Column({
    name: 'line_group',
    type: 'enum',
    enum: STRATEGY_LINE_GROUPS,
  })
  lineGroup: StrategyLineGroup;

  @Column({
    type: 'enum',
    enum: STRATEGY_BOUNDARIES,
    nullable: true,
  })
  boundary: StrategyBoundary | null;

  @Column({ name: 'p1_time', type: 'bigint' })
  p1Time: number;

  @Column({
    name: 'p1_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  p1Price: number;

  @Column({ name: 'p2_time', type: 'bigint' })
  p2Time: number;

  @Column({
    name: 'p2_price',
    type: 'decimal',
    precision: 20,
    scale: 8,
  })
  p2Price: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
