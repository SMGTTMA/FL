import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  STRUCTURE_ALERT_TARGET_TYPES,
  StructureAlertTargetType,
} from '../types/structure-alert.types';

export class QueryStructureAlertRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  symbol?: string;

  @IsOptional()
  @IsEnum(TimeFrame, {
    message: 'timeframe 仅支持 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w',
  })
  timeframe?: TimeFrame;

  @IsOptional()
  @IsEnum(STRUCTURE_ALERT_TARGET_TYPES, {
    message: '目标类型仅支持 KEY_LEVEL、STRUCTURE_LINE',
  })
  targetType?: StructureAlertTargetType;
}
