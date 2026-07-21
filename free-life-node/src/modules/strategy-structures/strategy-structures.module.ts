import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyMarketDirection } from './entities/strategy-market-direction.entity';
import { StrategyKeyLevel } from './entities/strategy-key-level.entity';
import { StrategyStructureLine } from './entities/strategy-structure-line.entity';
import { StrategyStructuresController } from './strategy-structures.controller';
import { StrategyStructuresService } from './strategy-structures.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StrategyKeyLevel,
      StrategyStructureLine,
      StrategyMarketDirection,
    ]),
  ],
  controllers: [StrategyStructuresController],
  providers: [StrategyStructuresService],
  exports: [StrategyStructuresService],
})
export class StrategyStructuresModule {}
