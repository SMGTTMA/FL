import { Controller, Post, Body } from '@nestjs/common';
import { ActiveSpotMartinTradesService } from './active-spot-martin-trades.service';
import { CreateActiveSpotMartinTradeDto } from './dto/create-active-spot-martin-trade.dto';
import { UpdateActiveSpotMartinTradeDto } from './dto/update-active-spot-martin-trade.dto';
import { QueryActiveSpotMartinTradeDto } from './dto/query-active-spot-martin-trade.dto';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { User } from '../../modules/auth/entities/user.entity';

@Controller('active-spot-martin-trades')
export class ActiveSpotMartinTradesController {
  constructor(
    private readonly activeSpotMartinTradesService: ActiveSpotMartinTradesService,
  ) {}

  /**
   * 创建活跃现货马丁交易记录
   */
  @Post('create')
  async create(
    @Body() createDto: CreateActiveSpotMartinTradeDto,
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.singleCreate(createDto, user.id);
  }

  /**
   * 查询活跃现货马丁交易记录列表
   */
  @Post('findAll')
  async findAll(
    @Body() queryDto: QueryActiveSpotMartinTradeDto,
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.findAll(queryDto, user.id);
  }

  /**
   * 根据ID查询活跃现货马丁交易记录
   */
  @Post('findOne')
  async findOne(@Body() body: { orderId: string }, @CurrentUser() user: User) {
    return await this.activeSpotMartinTradesService.findOne(
      body.orderId,
      user.id,
    );
  }

  /**
   * 更新活跃现货马丁交易记录
   */
  @Post('batchUpdate')
  async batchUpdate(
    @Body()
    body: {
      updateDtoList: UpdateActiveSpotMartinTradeDto[];
      strategyName: string;
    },
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.batchUpdate(
      body.updateDtoList,
      body.strategyName,
      user.id,
    );
  }

  /**
   * 批量删除活跃现货马丁交易记录
   */
  @Post('batchRemove')
  async batchRemove(
    @Body() body: { orderIds: string[] },
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.batchRemove(
      body.orderIds,
      user.id,
    );
  }

  /** 删除某个策略名称的所有交易记录 */
  @Post('batchRemoveByStrategyName')
  async batchRemoveByStrategyName(
    @Body() body: { strategyName: string },
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.batchRemoveByStrategyName(
      body.strategyName,
      user.id,
    );
  }

  /**
   * 根据策略名称查询活跃交易记录
   */
  @Post('findByStrategyName')
  async findByStrategyName(
    @Body() body: { strategyName: string },
    @CurrentUser() user: User,
  ) {
    return await this.activeSpotMartinTradesService.findByStrategyName(
      body.strategyName,
      user.id,
    );
  }

  /**
   * 查询需要重新挂单的交易记录（价格偏离的订单）
   */
  @Post('findPriceDeviatedTrades')
  async findPriceDeviatedTrades(@CurrentUser() user: User) {
    return await this.activeSpotMartinTradesService.findPriceDeviatedTrades(
      user.id,
    );
  }
}
