import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionLog } from './entities/exception-log.entity';
import { ExceptionLogService } from './exception-log.service';
import { ExceptionLogController } from './exception-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExceptionLog])],
  providers: [ExceptionLogService],
  exports: [ExceptionLogService],
  controllers: [ExceptionLogController],
})
export class ExceptionLogModule {}