import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyRecordsController } from './strategy-records.controller';
import { StrategyRecordsService } from './strategy-records.service';
import { StrategyRecord } from './entities/strategy-record.entity';
import { ExchangeModule } from '@/modules/exchange/exchange.module';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyRecord, ExchangeConfig]),
    ExchangeModule,
    KlineCacheModule,
  ],
  controllers: [StrategyRecordsController],
  providers: [StrategyRecordsService],
  exports: [StrategyRecordsService],
})
export class StrategyRecordsModule {}
