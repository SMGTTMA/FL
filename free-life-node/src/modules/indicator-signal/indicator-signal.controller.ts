import { Body, Controller, Post } from '@nestjs/common';
import { IndicatorSignalService } from './indicator-signal.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { StartSignalWatchDto } from './dto/start-signal-watch.dto';
import { StopSignalWatchDto } from './dto/stop-signal-watch.dto';

@Controller('indicator-signal')
export class IndicatorSignalController {
  constructor(
    private readonly indicatorSignalService: IndicatorSignalService,
  ) {}

  /**
   * 启动信号监听
   */
  @Post('start')
  async start(@Body() dto: StartSignalWatchDto, @CurrentUser() user: User) {
    return this.indicatorSignalService.start(dto, user.id);
  }

  /**
   * 停止信号监听
   */
  @Post('stop')
  async stop(@Body() dto: StopSignalWatchDto, @CurrentUser() user: User) {
    return this.indicatorSignalService.stop(dto, user.id);
  }

  /**
   * 获取监听列表
   */
  @Post('list')
  async getWatchList(@CurrentUser() user: User) {
    return this.indicatorSignalService.getWatchList(user.id);
  }

  /**
   * 测试发送消息到企业微信（拉取 K 线 → AI 分析 → 推送）
   */
  @Post('test-send')
  async testSend(@Body() dto: StartSignalWatchDto) {
    return this.indicatorSignalService.testSendMessage(dto);
  }
}
