import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { StrategyKeyLevel } from '../strategy-structures/entities/strategy-key-level.entity';
import { StrategyMarketDirection } from '../strategy-structures/entities/strategy-market-direction.entity';
import { StrategyStructureLine } from '../strategy-structures/entities/strategy-structure-line.entity';
import { ExchangeModule } from '../exchange/exchange.module';
import { KlineCacheModule } from '../kline-cache/kline-cache.module';
import { StrategyUtilsModule } from '../strategy-utils/strategy-utils.module';
import { ExceptionLogModule } from '../exception-log/exception-log.module';
import { StrategyRecordsModule } from '../strategy-records/strategy-records.module';
import { ActiveSpotMartinTradesModule } from '../active-spot-martin-trades/active-spot-martin-trades.module';
import { PriceActionSpotController } from './price-action-spot.controller';
import { PriceActionSpotService } from './price-action-spot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StrategyRecord,
      StrategyMarketDirection,
      StrategyKeyLevel,
      StrategyStructureLine,
    ]),
    ExchangeModule,
    KlineCacheModule,
    StrategyUtilsModule,
    ExceptionLogModule,
    StrategyRecordsModule,
    ActiveSpotMartinTradesModule,
  ],
  controllers: [PriceActionSpotController],
  providers: [PriceActionSpotService],
  exports: [PriceActionSpotService],
})
export class PriceActionSpotModule {}
