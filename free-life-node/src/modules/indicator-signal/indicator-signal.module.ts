import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndicatorSignalService } from './indicator-signal.service';
import { IndicatorSignalController } from './indicator-signal.controller';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { TradingPairsModule } from '@/modules/trading-pairs/trading-pairs.module';
import { ExceptionLogModule } from '@/modules/exception-log/exception-log.module';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import { StrategyUtilsModule } from '@/modules/strategy-utils/strategy-utils.module';
import { DeepseekModule } from '@/modules/deepseek/deepseek.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([StrategyRecord]),
    KlineCacheModule,
    TradingPairsModule,
    ExceptionLogModule,
    StrategyUtilsModule,
    DeepseekModule,
  ],
  controllers: [IndicatorSignalController],
  providers: [IndicatorSignalService],
  exports: [IndicatorSignalService],
})
export class IndicatorSignalModule {}
