import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSpotEmaTrade } from './entities/active-spot-ema-trade.entity';
import { ActiveSpotEmaTradesService } from './active-spot-ema-trades.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActiveSpotEmaTrade])],
  providers: [ActiveSpotEmaTradesService],
  exports: [ActiveSpotEmaTradesService],
})
export class ActiveSpotEmaTradesModule {}
