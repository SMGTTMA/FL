import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { KlineCacheService, KlineEnv } from './kline-cache.service';
import { TimeFrame } from '../exchange/dto/history.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';

@Controller('klineCache')
export class KlineCacheController {
  constructor(private readonly klineCacheService: KlineCacheService) {}

  @Post('getAllCache')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async getAllCache() {
    return this.klineCacheService.getAllCache();
  }

  @Post('getKlines')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async getKlines(
    @Body() body: { symbol: string; timeframe: TimeFrame; env: KlineEnv },
  ) {
    return this.klineCacheService.getKlines(
      body.symbol,
      body.timeframe,
      body.env,
    );
  }

  @Post('getCacheStatus')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async getCacheStatus() {
    return this.klineCacheService.getCacheStatus();
  }
}
