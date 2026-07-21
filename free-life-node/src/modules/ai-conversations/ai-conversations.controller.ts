import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiConversationsService } from './ai-conversations.service';
import { QueryAiConversationDto } from './dto/query-ai-conversation.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';

/**
 * AI对话查询控制器
 * 提供前端查询AI对话历史的接口
 */
@Controller('ai-conversations')
export class AiConversationsController {
  constructor(
    private readonly aiConversationsService: AiConversationsService,
  ) {}

  /**
   * 查询所有AI对话记录（管理员权限）
   */
  @Post('list')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async findAll(@Body() queryDto: QueryAiConversationDto) {
    return await this.aiConversationsService.findAllWithPagination(queryDto);
  }

  /**
   * 查询当前用户的AI对话记录
   */
  @Post('myConversations')
  async findMyConversations(
    @CurrentUser() user: User,
    @Body() queryDto: QueryAiConversationDto,
  ) {
    return await this.aiConversationsService.findByUserIdWithPagination(
      user.id,
      queryDto,
    );
  }

  /**
   * 查询指定策略的AI对话记录（需要用户自己的策略）
   */
  @Post('byStrategy')
  async findByStrategy(
    @CurrentUser() user: User,
    @Body() queryDto: QueryAiConversationDto,
  ) {
    // 确保查询的是当前用户的数据
    const query = { ...queryDto, userId: user.id };
    return await this.aiConversationsService.findByUserIdWithPagination(
      user.id,
      query,
    );
  }
}
