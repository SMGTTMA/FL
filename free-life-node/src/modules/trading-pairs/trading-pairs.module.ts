import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingPair } from './entities/trading-pair.entity';
import { TradingPairsService } from './trading-pairs.service';
import { TradingPairsController } from './trading-pairs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TradingPair])],
  controllers: [TradingPairsController],
  providers: [TradingPairsService],
  exports: [TradingPairsService],
})
export class TradingPairsModule {}