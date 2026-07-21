import { Module } from '@nestjs/common';
import { KlineCacheService } from './kline-cache.service';
import { KlineCacheController } from './kline-cache.controller';
import { ExchangeModule } from '@/modules/exchange/exchange.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { ExceptionLogModule } from '../exception-log/exception-log.module';
import { TradingPairsModule } from '@/modules/trading-pairs/trading-pairs.module';
import { StrategyUtilsModule } from '@/modules/strategy-utils/strategy-utils.module';

@Module({
  imports: [
    ExchangeModule,
    TypeOrmModule.forFeature([StrategyRecord, ExchangeConfig]),
    ExceptionLogModule,
    TradingPairsModule,
    StrategyUtilsModule,
  ],
  providers: [KlineCacheService],
  controllers: [KlineCacheController],
  exports: [KlineCacheService],
})
export class KlineCacheModule {}