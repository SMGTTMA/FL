import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConversationsService } from './ai-conversations.service';
import { AiConversationsController } from './ai-conversations.controller';
import { AiConversation } from './entities/ai-conversation.entity';

/**
 * 通用AI对话模块
 * 所有AI策略都可以使用这个模块来保存对话记录
 */
@Module({
  imports: [TypeOrmModule.forFeature([AiConversation])],
  controllers: [AiConversationsController],
  providers: [AiConversationsService],
  exports: [AiConversationsService],
})
export class AiConversationsModule {}
