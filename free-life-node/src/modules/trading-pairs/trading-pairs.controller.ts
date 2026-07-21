import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TradingPairsService } from './trading-pairs.service';
import { CreateTradingPairDto } from './dto/create-trading-pair.dto';
import { DisableTradingPairDto } from './dto/disable-trading-pair.dto';
import { QueryTradingPairDto } from './dto/query-trading-pair.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';

@Controller('tradingPairs')
export class TradingPairsController {
  constructor(private readonly tradingPairsService: TradingPairsService) {}

  @Post('create')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async create(@Body() dto: CreateTradingPairDto) {
    return await this.tradingPairsService.create(dto);
  }

  @Post('update')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async update(@Body() body: { id: number; data: CreateTradingPairDto }) {
    return await this.tradingPairsService.update(body.id, body.data);
  }

  // TODO: minshengbing 删除和禁用功能 需要验证该交易对是否被使用
  @Post('delete')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async delete(@Body() body: { id: number }) {
    return await this.tradingPairsService.delete(body.id);
  }

  @Post('disable')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async disable(@Body() dto: DisableTradingPairDto) {
    return await this.tradingPairsService.disable(dto.id);
  }

  @Post('enable')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async enable(@Body() body: { id: number }) {
    return await this.tradingPairsService.enable(body.id);
  }

  @Post('findAll')
  async findAll(@Body() dto: QueryTradingPairDto) {
    return await this.tradingPairsService.findAll(dto);
  }

  @Post('findOne')
  async findOne(@Body() body: { id: number }) {
    return await this.tradingPairsService.findOne(body.id);
  }
}