import { Controller, Post, Body } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { ResponseDto } from '@/common/dto/response.dto';

@Controller('deepseek')
export class DeepseekController {
  constructor(private readonly deepseekService: DeepseekService) {}

  /**
   * 调用 Deepseek 进行通用对话
   */
  @Post('chat')
  async chat(@Body() dto: ChatCompletionDto) {
    const content = await this.deepseekService.createChatCompletion(dto);
    return ResponseDto.success({ content });
  }
}
