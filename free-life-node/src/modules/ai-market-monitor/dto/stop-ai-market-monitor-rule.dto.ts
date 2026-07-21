import { IsNotEmpty, IsNumber } from 'class-validator';

export class StopAiMarketMonitorRuleDto {
  @IsNotEmpty({ message: '规则ID不能为空' })
  @IsNumber()
  ruleId: number;
}
