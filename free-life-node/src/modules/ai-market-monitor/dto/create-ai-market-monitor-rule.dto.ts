import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MonitorCheckInterval } from '../types/ai-market-monitor.types';
import { Transform } from 'class-transformer';

export class CreateAiMarketMonitorRuleDto {
  @IsNotEmpty({ message: '交易对不能为空' })
  @IsString()
  symbol: string;

  @IsNotEmpty({ message: '交易所配置ID不能为空' })
  @IsNumber()
  exchangeConfigId: number;

  @IsNotEmpty({ message: '监控指令不能为空' })
  @IsString()
  instruction: string;

  @IsNotEmpty({ message: '定时周期不能为空' })
  @IsEnum(MonitorCheckInterval, {
    message: '定时周期仅支持：5m, 30m, 1h, 4h, 1d, 1w',
  })
  checkInterval: MonitorCheckInterval;

  @IsOptional()
  @IsNumber()
  @Min(6, { message: 'k线窗口最少 6 根' })
  @Max(500, { message: 'k线窗口最多 500 根' })
  klineWindow?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    if (typeof value === 'number') return value === 1;
    return false;
  })
  @IsBoolean({ message: 'repeatMonitor 必须是布尔值' })
  repeatMonitor?: boolean;
}
