import { Module } from '@nestjs/common';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { HistoricalBacktestController } from './historical-backtest.controller';
import { HistoricalBacktestService } from './historical-backtest.service';

@Module({
  imports: [KlineCacheModule],
  controllers: [HistoricalBacktestController],
  providers: [HistoricalBacktestService],
  exports: [HistoricalBacktestService],
})
export class HistoricalBacktestModule {}

