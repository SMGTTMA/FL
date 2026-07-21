import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GridCashController } from './grid-cash.controller';
import { GridCashService } from './grid-cash.service';
import { ExchangeModule } from '../exchange/exchange.module';
import { TradingPairsModule } from '../trading-pairs/trading-pairs.module';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { StrategyUtilsModule } from '@/modules/strategy-utils/strategy-utils.module';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { ExceptionLogModule } from '../exception-log/exception-log.module';
import { StrategyRecordsModule } from '../strategy-records/strategy-records.module';
import { ActiveSpotMartinTradesModule } from '../active-spot-martin-trades/active-spot-martin-trades.module';
import { RejectedOrdersModule } from '../rejected-orders/rejected-orders.module';

// 网格现金策略
@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyRecord]),
    ExchangeModule,
    TradingPairsModule,
    KlineCacheModule,
    StrategyUtilsModule,
    ExceptionLogModule,
    StrategyRecordsModule,
    ActiveSpotMartinTradesModule,
    RejectedOrdersModule,
  ],
  controllers: [GridCashController],
  providers: [GridCashService],
  exports: [GridCashService],
})
export class GridCashModule {}
