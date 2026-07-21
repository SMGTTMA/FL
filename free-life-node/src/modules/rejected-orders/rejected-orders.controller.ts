import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RejectedOrdersService } from './rejected-orders.service';
import { CreateRejectedOrderDto } from './dto/create-rejected-order.dto';
import { CreateBatchRejectedOrderDto } from './dto/create-batch-rejected-order.dto';
import { QueryRejectedOrderDto } from './dto/query-rejected-order.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';

@Controller('rejected-orders')
export class RejectedOrdersController {
  constructor(private readonly rejectedOrdersService: RejectedOrdersService) {}

  /**
   * 创建被拒绝的订单记录
   */
  @Post()
  async create(@Body() createRejectedOrderDto: CreateRejectedOrderDto) {
    return await this.rejectedOrdersService.create(createRejectedOrderDto);
  }

  /**
   * 批量创建被拒绝的订单记录
   */
  @Post('batch')
  async createBatch(@Body() createBatchDto: CreateBatchRejectedOrderDto) {
    return await this.rejectedOrdersService.createBatch(createBatchDto.orders);
  }

  /**
   * 查询所有被拒绝的订单记录（管理员权限）
   */
  @Post('list')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async findAll(@Body() queryDto: QueryRejectedOrderDto) {
    return await this.rejectedOrdersService.findAll(queryDto);
  }

  /**
   * 查询当前用户的被拒绝订单记录
   */
  @Post('rejectedOrders')
  async findMyRejectedOrders(
    @CurrentUser() user: User,
    @Body() queryDto: QueryRejectedOrderDto,
  ) {
    return await this.rejectedOrdersService.findByUserId(
      user.id,
      queryDto,
    );
  }
}
