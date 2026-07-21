import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exception_logs')
export class ExceptionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  url: string;

  @Column({ length: 10 })
  method: string;

  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  @Column('text')
  message: string;

  @Column('text', { nullable: true })
  stack: string;

  @Column({ nullable: true, name: 'user_id', type: 'int' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
