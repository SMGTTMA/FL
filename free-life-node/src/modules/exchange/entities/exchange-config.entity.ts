import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('exchange_configs')
export class ExchangeConfig {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'exchange_name', length: 50 })
  exchangeName: string;

  @Column({ name: 'config_name', length: 50 })
  configName: string;

  @Column({ name: 'api_key', type: 'text' })
  apiKey: string;

  @Column({ name: 'secret_key', type: 'text' })
  secretKey: string;

  @Column({ name: 'passphrase', type: 'text' })
  passphrase: string;

  @Column({ name: 'is_test_net', type: 'tinyint', default: 0 })
  isTestNet: number;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}