import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMarketMonitorController } from './ai-market-monitor.controller';
import { AiMarketMonitorService } from './ai-market-monitor.service';
import { AiMarketMonitorRule } from './entities/ai-market-monitor-rule.entity';
import { AiMarketMonitorLog } from './entities/ai-market-monitor-log.entity';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { ExceptionLogModule } from '@/modules/exception-log/exception-log.module';
import { DeepseekModule } from '@/modules/deepseek/deepseek.module';
import { TradingPairsModule } from '@/modules/trading-pairs/trading-pairs.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AiMarketMonitorRule,
      AiMarketMonitorLog,
      ExchangeConfig,
    ]),
    KlineCacheModule,
    ExceptionLogModule,
    DeepseekModule,
    TradingPairsModule,
  ],
  controllers: [AiMarketMonitorController],
  providers: [AiMarketMonitorService],
  exports: [AiMarketMonitorService],
})
export class AiMarketMonitorModule {}
