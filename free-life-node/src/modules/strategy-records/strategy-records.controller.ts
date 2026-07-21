import { Controller, Post, Body } from '@nestjs/common';
import { StrategyRecordsService } from './strategy-records.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AdjustPositionSizeDto } from './dto/adjust-position-size.dto';
import { QueryStrategyRecordDto } from './dto/query-strategy-record.dto';

@Controller('strategies')
export class StrategyRecordsController {
  constructor(
    private readonly strategyRecordsService: StrategyRecordsService,
  ) {}

  /**
   * 获取策略记录列表
   */
  @Post('list')
  async getList(
    @CurrentUser() user: User,
    @Body() dto: QueryStrategyRecordDto,
  ) {
    return await this.strategyRecordsService.getList(user.id, dto);
  }

  /**
   * 调整策略仓位大小
   */
  @Post('adjustPositionSize')
  async adjustPositionSize(
    @CurrentUser() user: User,
    @Body() dto: AdjustPositionSizeDto,
  ) {
    return await this.strategyRecordsService.adjustPositionSize(user.id, dto);
  }
}
