import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { StrategyEnvService } from './strategy-env.service';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { ExchangeModule } from '../exchange/exchange.module';
import { TradingPairsModule } from '../trading-pairs/trading-pairs.module';
import { ActiveSpotMartinTradesModule } from '../active-spot-martin-trades/active-spot-martin-trades.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeConfig, StrategyRecord]),
    ExchangeModule,
    TradingPairsModule,
    ActiveSpotMartinTradesModule,
  ],
  providers: [StrategyEnvService],
  exports: [StrategyEnvService],
})
export class StrategyUtilsModule {}
