import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  STRUCTURE_ALERT_TARGET_TYPES,
  StructureAlertTargetType,
} from '../types/structure-alert.types';

function toBoolean(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }
  return defaultValue;
}

export class CreateStructureAlertRuleDto {
  @IsNotEmpty({ message: '交易所配置ID不能为空' })
  @IsNumber()
  exchangeConfigId: number;

  @IsNotEmpty({ message: '目标类型不能为空' })
  @IsEnum(STRUCTURE_ALERT_TARGET_TYPES, {
    message: '目标类型仅支持 KEY_LEVEL、STRUCTURE_LINE',
  })
  targetType: StructureAlertTargetType;

  @IsNotEmpty({ message: '目标ID不能为空' })
  @IsNumber()
  targetId: number;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value, true))
  @IsBoolean({ message: 'monitorNear 必须是布尔值' })
  monitorNear?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value, true))
  @IsBoolean({ message: 'monitorBreakUp 必须是布尔值' })
  monitorBreakUp?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value, true))
  @IsBoolean({ message: 'monitorBreakDown 必须是布尔值' })
  monitorBreakDown?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'nearThreshold 不能小于 0' })
  nearThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'breakoutThreshold 不能小于 0' })
  breakoutThreshold?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

