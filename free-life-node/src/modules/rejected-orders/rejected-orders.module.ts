import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RejectedOrdersController } from './rejected-orders.controller';
import { RejectedOrdersService } from './rejected-orders.service';
import { RejectedOrder } from './entities/rejected-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RejectedOrder]),
  ],
  controllers: [RejectedOrdersController],
  providers: [RejectedOrdersService],
  exports: [RejectedOrdersService],
})
export class RejectedOrdersModule {}