import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { ExceptionLogModule } from '@/modules/exception-log/exception-log.module';
import { KlineCacheModule } from '@/modules/kline-cache/kline-cache.module';
import { StrategyKeyLevel } from '@/modules/strategy-structures/entities/strategy-key-level.entity';
import { StrategyStructureLine } from '@/modules/strategy-structures/entities/strategy-structure-line.entity';
import { StructureAlertRule } from './entities/structure-alert-rule.entity';
import { StructureAlertsController } from './structure-alerts.controller';
import { StructureAlertsService } from './structure-alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StructureAlertRule,
      ExchangeConfig,
      StrategyKeyLevel,
      StrategyStructureLine,
    ]),
    KlineCacheModule,
    ExceptionLogModule,
  ],
  controllers: [StructureAlertsController],
  providers: [StructureAlertsService],
  exports: [StructureAlertsService],
})
export class StructureAlertsModule {}

