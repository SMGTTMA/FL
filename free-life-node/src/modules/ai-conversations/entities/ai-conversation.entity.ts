import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_conversations')
export class AiConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_type', type: 'varchar', length: 50 })
  strategyType: string;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ name: 'ai_response', type: 'text' })
  aiResponse: string;

  @Column({ type: 'json', nullable: true })
  decision: object;

  @Column({
    name: 'execution_result',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  executionResult: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
