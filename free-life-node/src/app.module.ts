import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { ExchangeModule } from './modules/exchange/exchange.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { TradingPairsModule } from './modules/trading-pairs/trading-pairs.module';
import { KlineCacheModule } from './modules/kline-cache/kline-cache.module';
import { ExceptionLogModule } from './modules/exception-log/exception-log.module';
import { StrategyRecordsModule } from './modules/strategy-records/strategy-records.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ActiveSpotMartinTradesModule } from './modules/active-spot-martin-trades/active-spot-martin-trades.module';
import { ActiveSpotEmaTradesModule } from './modules/active-spot-ema-trades/active-spot-ema-trades.module';

import { RejectedOrdersModule } from './modules/rejected-orders/rejected-orders.module';
import { GridCashModule } from './modules/grid-cash/grid-cash.module';
import { IndicatorSignalModule } from './modules/indicator-signal/indicator-signal.module';

import { DeepseekModule } from './modules/deepseek/deepseek.module';
import { AiConversationsModule } from './modules/ai-conversations/ai-conversations.module';
import { AiMarketMonitorModule } from './modules/ai-market-monitor/ai-market-monitor.module';
import { HistoricalBacktestModule } from './modules/historical-backtest/historical-backtest.module';
import { StrategyStructuresModule } from './modules/strategy-structures/strategy-structures.module';
import { StructureAlertsModule } from './modules/structure-alerts/structure-alerts.module';
import { StructureEmaSpotModule } from './modules/structure-ema-spot/structure-ema-spot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.ENVIRONMENT === 'development',
    }),
    AuthModule,
    ExchangeModule,
    CryptoModule,
    TradingPairsModule,
    KlineCacheModule,
    ExceptionLogModule,
    StrategyRecordsModule,
    ActiveSpotMartinTradesModule,
    ActiveSpotEmaTradesModule,
    RejectedOrdersModule,
    GridCashModule,
    IndicatorSignalModule,
    DeepseekModule,
    AiConversationsModule,
    AiMarketMonitorModule,
    HistoricalBacktestModule,
    StrategyStructuresModule,
    StructureAlertsModule,
    StructureEmaSpotModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
