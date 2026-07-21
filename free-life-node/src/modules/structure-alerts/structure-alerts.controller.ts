import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { CreateStructureAlertRuleDto } from './dto/create-structure-alert-rule.dto';
import { DeleteStructureAlertRuleDto } from './dto/delete-structure-alert-rule.dto';
import { QueryStructureAlertRuleDto } from './dto/query-structure-alert-rule.dto';
import { UpdateStructureAlertRuleStatusDto } from './dto/update-structure-alert-rule-status.dto';
import { StructureAlertsService } from './structure-alerts.service';

@Controller('structure-alerts')
export class StructureAlertsController {
  constructor(
    private readonly structureAlertsService: StructureAlertsService,
  ) {}

  @Post('rule/create')
  async createRule(
    @Body() dto: CreateStructureAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.structureAlertsService.createRule(dto, user.id);
  }

  @Post('rule/list')
  async listRules(
    @Body() dto: QueryStructureAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.structureAlertsService.listRules(dto, user.id);
  }

  @Post('rule/enable')
  async enableRule(
    @Body() dto: UpdateStructureAlertRuleStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.structureAlertsService.enableRule(dto.ruleId, user.id);
  }

  @Post('rule/disable')
  async disableRule(
    @Body() dto: UpdateStructureAlertRuleStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.structureAlertsService.disableRule(dto.ruleId, user.id);
  }

  @Post('rule/delete')
  async deleteRule(
    @Body() dto: DeleteStructureAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.structureAlertsService.deleteRule(dto.ruleId, user.id);
  }
}

