import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TimeFrame {
  M1 = '1m',
  M5 = '5m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d',
  W1 = '1w',
}

export class GetHistoryDto {
  // 交易所配置ID
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsString()
  @Matches(/^[A-Z0-9]+\/[A-Z0-9]+$/, {
    message: '交易对格式不正确，正确格式如：BTC/USDT',
  })
  symbol: string;

  @IsEnum(TimeFrame, {
    message: '时间周期必须是以下值之一：1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w',
  })
  timeframe: TimeFrame;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, {
    message: '开始时间格式不正确，正确格式如：2024-03-20T10:00:00Z',
  })
  startTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'limit 最小值为 1' })
  @Max(1000, { message: 'limit 最大值为 1000' })
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
