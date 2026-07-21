import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { GetHistoryDto } from './dto/history.dto';
import { CreateExchangeConfigDto } from './dto/create-exchange-config.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { PlaceOrderDto } from './dto/place-order.dto';
import { SetMarginModeDto } from './dto/set-margin-mode.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post('addConfig')
  async createConfig(
    @CurrentUser() user: User,
    @Body() createExchangeConfigDto: CreateExchangeConfigDto,
  ) {
    return await this.exchangeService.createConfig(
      user.id,
      createExchangeConfigDto,
    );
  }

  @Post('getConfig')
  async getConfig(@CurrentUser() user: User) {
    return await this.exchangeService.getConfig(user.id);
  }

  @Post('deleteConfig')
  async deleteConfig(@Body() body: { id: number }) {
    return await this.exchangeService.disableConfig(body.id);
  }

  @Post('balance')
  async getBalance(@Body() body: { id: number }) {
    return this.exchangeService.getBalance(body.id);
  }

  @Post('klines')
  getKlines(@Body() dto: GetHistoryDto) {
    return this.exchangeService.getKlines(dto);
  }

  @Post('market')
  getMarket(@Body() body: { id: number; symbol: string }) {
    return this.exchangeService.getMarketInfo(body.id, body.symbol);
  }

  // 批量下单 需要超级管理员权限 用于测试 正式环境需要使用订单服务
  @Post('createOrders')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  createOrders(
    @Body()
    body: {
      exchangeConfigId: number;
      orders: PlaceOrderDto[];
      params?: Record<string, any>;
    },
  ) {
    return this.exchangeService.createOrders(
      body.exchangeConfigId,
      body.orders,
      body.params,
    );
  }

  @Post('fetchOpenOrders')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async fetchOpenOrders(
    @Body() body: { exchangeConfigId: number; symbol?: string },
  ) {
    return this.exchangeService.fetchOpenOrders(
      body.exchangeConfigId,
      body.symbol,
    );
  }

  @Post('batchCancelOrders')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async batchCancelOrders(
    @Body()
    body: {
      exchangeConfigId: number;
      orderIds: string[];
      symbol?: string;
    },
  ) {
    return this.exchangeService.batchCancelOrders(
      body.exchangeConfigId,
      body.orderIds,
      body.symbol,
    );
  }

  @Post('fetchMarkets')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async fetchMarkets(@Body() body: { isTestNet: boolean }) {
    return this.exchangeService.fetchMarkets(body.isTestNet);
  }

  @Post('fetchLeverage')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async fetchLeverage(
    @Body() body: { exchangeConfigId: number; symbol: string },
  ) {
    return this.exchangeService.fetchLeverage(
      body.exchangeConfigId,
      body.symbol,
    );
  }

  @Post('setLeverage')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async setLeverage(
    @Body()
    body: {
      exchangeConfigId: number;
      symbol: string;
      leverage: number;
      params?: Record<string, any>;
    },
  ) {
    return this.exchangeService.setLeverage(
      body.exchangeConfigId,
      body.symbol,
      body.leverage,
      body.params,
    );
  }

  @Post('setMarginMode')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async setMarginMode(@Body() dto: SetMarginModeDto) {
    return this.exchangeService.setMarginMode(
      dto.exchangeConfigId,
      dto.symbol,
      dto.marginMode,
      dto.leverage,
    );
  }

  @Post('editOrder')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async editOrder(
    @Body()
    body: {
      orderId: string;
      exchangeConfigId: number;
      symbol: string;
      amount: number;
      side: string;
      type: string;
    },
  ) {
    return this.exchangeService.editOrder(body);
  }

  @Post('fetchPosition')
  async fetchPosition(
    @Body() body: { exchangeConfigId: number; symbol?: string },
  ) {
    return this.exchangeService.fetchPosition(
      body.exchangeConfigId,
      body.symbol,
    );
  }
}
