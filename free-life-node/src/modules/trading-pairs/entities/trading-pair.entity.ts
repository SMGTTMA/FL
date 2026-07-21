import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('trading_pairs')
export class TradingPair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  symbol: string;

  @Column({ name: 'base_asset', length: 20 })
  baseAsset: string;

  @Column({ name: 'quote_asset', length: 20 })
  quoteAsset: string;

  @Column({ type: 'enum', enum: ['spot', 'contract'] })
  type: 'spot' | 'contract';

  @Column({ name: 'exchange_name', length: 50 })
  exchangeName: string;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}