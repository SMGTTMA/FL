import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ExceptionLogService } from './exception-log.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Controller('exceptionLog')
export class ExceptionLogController {
  constructor(private readonly exceptionLogService: ExceptionLogService) {}

  /**
   * 查询所有异常日志
   */
  @Post('list')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async findAll(@Body() dto: PaginationDto) {
    return this.exceptionLogService.findAll(dto);
  }
}
