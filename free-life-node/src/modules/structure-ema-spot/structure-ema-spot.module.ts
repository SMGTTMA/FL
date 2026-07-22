import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSpotEmaTradesModule } from '@/modules/active-spot-ema-trades/active-spot-ema-trades.module';
import { ExceptionLogModule } from '@/modules/exception-log/exception-log.module';
import { ExchangeModule } from '@/modules/exchange/exchange.module';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { RejectedOrdersModule } from '@/modules/rejected-orders/rejected-orders.module';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import { StrategyRecordsModule } from '@/modules/strategy-records/strategy-records.module';
import { StrategyStructuresModule } from '@/modules/strategy-structures/strategy-structures.module';
import { StrategyUtilsModule } from '@/modules/strategy-utils/strategy-utils.module';
import { StructureEmaSpotController } from './structure-ema-spot.controller';
import { StructureEmaSpotService } from './structure-ema-spot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyRecord]),
    ActiveSpotEmaTradesModule,
    ExceptionLogModule,
    ExchangeModule,
    KlineCacheModule,
    RejectedOrdersModule,
    StrategyRecordsModule,
    StrategyStructuresModule,
    StrategyUtilsModule,
  ],
  controllers: [StructureEmaSpotController],
  providers: [StructureEmaSpotService],
  exports: [StructureEmaSpotService],
})
export class StructureEmaSpotModule {}
