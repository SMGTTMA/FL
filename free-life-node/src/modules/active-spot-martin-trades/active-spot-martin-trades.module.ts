import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSpotMartinTradesController } from './active-spot-martin-trades.controller';
import { ActiveSpotMartinTradesService } from './active-spot-martin-trades.service';
import { ActiveSpotMartinTrade } from './entities/active-spot-martin-trade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActiveSpotMartinTrade])],
  controllers: [ActiveSpotMartinTradesController],
  providers: [ActiveSpotMartinTradesService],
  exports: [ActiveSpotMartinTradesService],
})
export class ActiveSpotMartinTradesModule {}