import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { AiMarketMonitorService } from './ai-market-monitor.service';
import { CreateAiMarketMonitorRuleDto } from './dto/create-ai-market-monitor-rule.dto';
import { QueryAiMarketMonitorLogDto } from './dto/query-ai-market-monitor-log.dto';
import { StopAiMarketMonitorRuleDto } from './dto/stop-ai-market-monitor-rule.dto';
import { TestAiMarketMonitorRuleDto } from './dto/test-ai-market-monitor-rule.dto';

@Controller('ai-market-monitor')
export class AiMarketMonitorController {
  constructor(
    private readonly aiMarketMonitorService: AiMarketMonitorService,
  ) {}

  @Post('rule/create')
  async createRule(
    @Body() dto: CreateAiMarketMonitorRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.aiMarketMonitorService.createRule(dto, user.id);
  }

  @Post('rule/stop')
  async stopRule(
    @Body() dto: StopAiMarketMonitorRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.aiMarketMonitorService.stopRule(dto, user.id);
  }

  @Post('rule/list')
  async listRules(@CurrentUser() user: User) {
    return this.aiMarketMonitorService.listRules(user.id);
  }

  @Post('rule/test')
  async testRule(
    @Body() dto: TestAiMarketMonitorRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.aiMarketMonitorService.testRule(dto, user.id);
  }

  @Post('log/list')
  async listLogs(
    @Body() dto: QueryAiMarketMonitorLogDto,
    @CurrentUser() user: User,
  ) {
    return this.aiMarketMonitorService.listLogs(dto, user.id);
  }
}
