import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { PriceActionSpotService } from './price-action-spot.service';
import { StartPriceActionSpotDto } from './dto/start-price-action-spot.dto';
import { StopPriceActionSpotDto } from './dto/stop-price-action-spot.dto';
import { EditPriceActionSpotDto } from './dto/edit-price-action-spot.dto';

@Controller('strategies/priceActionSpot')
export class PriceActionSpotController {
  constructor(
    private readonly priceActionSpotService: PriceActionSpotService,
  ) {}

  @Post('start')
  async start(@Body() dto: StartPriceActionSpotDto, @CurrentUser() user: User) {
    return this.priceActionSpotService.start(dto, user.id);
  }

  @Post('stop')
  async stop(@Body() dto: StopPriceActionSpotDto, @CurrentUser() user: User) {
    return this.priceActionSpotService.stop(dto.strategyId, user.id);
  }

  @Post('edit')
  async edit(@Body() dto: EditPriceActionSpotDto, @CurrentUser() user: User) {
    return this.priceActionSpotService.edit(dto, user.id);
  }

  @Post('getConfig')
  async getConfig() {
    return this.priceActionSpotService.getStrategyConfig();
  }
}

