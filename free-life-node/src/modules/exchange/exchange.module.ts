import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { ExchangeConfig } from './entities/exchange-config.entity';
import { CryptoModule } from '@/modules/crypto/crypto.module';
import { TradingPairsModule } from '@/modules/trading-pairs/trading-pairs.module';
import { TradingPair } from '@/modules/trading-pairs/entities/trading-pair.entity';
import { ExceptionLogModule } from '../exception-log/exception-log.module';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';

// 仅okx交易所
@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeConfig, TradingPair, StrategyRecord]),
    CryptoModule,
    TradingPairsModule,
    ExceptionLogModule,
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}
