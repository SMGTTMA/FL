import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  MonitorCheckInterval,
  MonitorNotifyStatus,
} from '../types/ai-market-monitor.types';

export class QueryAiMarketMonitorLogDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ruleId 必须为整数' })
  @Min(1, { message: 'ruleId 最小为 1' })
  ruleId?: number;

  @IsOptional()
  @IsString({ message: 'symbol 必须为字符串' })
  symbol?: string;

  @IsOptional()
  @IsEnum(MonitorCheckInterval, { message: 'checkInterval 参数不合法' })
  checkInterval?: MonitorCheckInterval;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'isTriggered 必须为整数' })
  @Min(0, { message: 'isTriggered 最小为 0' })
  @Max(1, { message: 'isTriggered 最大为 1' })
  isTriggered?: number;

  @IsOptional()
  @IsIn(
    [
      'not_needed',
      'success',
      'failed',
      'data_insufficient',
      'config_invalid',
      'skipped_not_due',
    ],
    { message: 'notifyStatus 参数不合法' },
  )
  notifyStatus?: MonitorNotifyStatus;
}
