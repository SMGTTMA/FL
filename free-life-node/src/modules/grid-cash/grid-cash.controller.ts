import { Controller, Post, Body } from '@nestjs/common';
import { GridCashService } from './grid-cash.service';
import { StartGridDto } from './dto/start-grid.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { StopGridDto } from './dto/stop-grid.dto';

@Controller('strategies/gridCash')
export class GridCashController {
  constructor(private readonly gridCashService: GridCashService) {}

  @Post('start')
  async startGrid(@CurrentUser() user: User, @Body() dto: StartGridDto) {
    return this.gridCashService.start(dto, user.id);
  }

  @Post('stop')
  async stopGrid(@Body() dto: StopGridDto, @CurrentUser() user: User) {
    return this.gridCashService.stop(dto.strategyId, user.id);
  }

  @Post('edit')
  async edit(
    @Body()
    dto: Pick<StartGridDto, 'configJson' | 'totalPositionSize'> & StopGridDto,
    @CurrentUser() user: User,
  ) {
    return this.gridCashService.edit(dto, user.id);
  }

  @Post('getConfig')
  async getConfig() {
    return this.gridCashService.getStrategyConfig();
  }
}
