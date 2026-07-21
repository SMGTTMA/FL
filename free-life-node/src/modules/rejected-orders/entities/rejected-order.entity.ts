import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationOrderType {
  CREATE = 'create',
  EDIT = 'edit',
}

@Entity('rejected_orders')
export class RejectedOrder {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'strategy_name', length: 50 })
  strategyName: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({ name: 'order_type', type: 'enum', enum: OperationOrderType })
  orderType: OperationOrderType;

  @Column('json')
  params: Record<string, any>;

  @Column({ name: 'reject_reason', length: 500, nullable: true })
  rejectReason: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'exchange_config_id' })
  exchangeConfigId: number;

  @Column({ name: 'exchange_name', length: 50 })
  exchangeName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}