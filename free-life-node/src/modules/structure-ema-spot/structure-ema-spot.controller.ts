import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { EditStructureEmaSpotDto } from './dto/edit-structure-ema-spot.dto';
import { StartStructureEmaSpotDto } from './dto/start-structure-ema-spot.dto';
import { StopStructureEmaSpotDto } from './dto/stop-structure-ema-spot.dto';
import { StructureEmaSpotService } from './structure-ema-spot.service';

@Controller('strategies/structureEmaSpot')
export class StructureEmaSpotController {
  constructor(
    private readonly structureEmaSpotService: StructureEmaSpotService,
  ) {}

  @Post('start')
  async start(
    @CurrentUser() user: User,
    @Body() dto: StartStructureEmaSpotDto,
  ) {
    return await this.structureEmaSpotService.start(dto, user.id);
  }

  @Post('stop')
  async stop(@CurrentUser() user: User, @Body() dto: StopStructureEmaSpotDto) {
    return await this.structureEmaSpotService.stop(dto.strategyId, user.id);
  }

  @Post('edit')
  async edit(@CurrentUser() user: User, @Body() dto: EditStructureEmaSpotDto) {
    return await this.structureEmaSpotService.edit(dto, user.id);
  }

  @Post('getConfig')
  getConfig() {
    return this.structureEmaSpotService.getStrategyConfig();
  }
}
