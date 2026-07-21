import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsISO8601,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { KlineEnv } from '@/modules/kline-cache/kline-cache.service';

export class GetTrendStrengthBacktestDto {
  @IsNotEmpty({ message: '交易对不能为空' })
  @IsString()
  @Matches(/^[A-Z0-9]+\/[A-Z0-9]+$/, {
    message: '交易对格式不正确，正确格式如：BTC/USDT',
  })
  symbol!: string;

  @IsEnum(TimeFrame, {
    message: '时间周期必须是以下值之一：1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w',
  })
  timeframe!: TimeFrame;

  @IsIn(['prod', 'test'], { message: 'env 只能是 prod 或 test' })
  env!: KlineEnv;

  @IsNotEmpty({ message: 'evaluateAt 不能为空' })
  @IsISO8601({}, { message: 'evaluateAt 必须是合法的 ISO 日期字符串' })
  evaluateAt!: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'klineNum 必须是整数' })
  @Min(50, { message: 'klineNum 最小为 50' })
  @Max(2000, { message: 'klineNum 最大为 2000' })
  klineNum?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean({ message: 'dropUnclosed 必须是布尔值' })
  dropUnclosed?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean({ message: 'includeKlines 必须是布尔值' })
  includeKlines?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'similarTolerance 必须是数字' })
  @Min(0, { message: 'similarTolerance 最小为 0' })
  @Max(0.5, { message: 'similarTolerance 最大为 0.5' })
  similarTolerance?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'minClarity 必须是数字' })
  @Min(0, { message: 'minClarity 最小为 0' })
  @Max(3, { message: 'minClarity 最大为 3' })
  minClarity?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'dominanceGap 必须是数字' })
  @Min(0, { message: 'dominanceGap 最小为 0' })
  @Max(1, { message: 'dominanceGap 最大为 1' })
  dominanceGap?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'maxLegs 必须是整数' })
  @Min(6, { message: 'maxLegs 最小为 6' })
  @Max(120, { message: 'maxLegs 最大为 120' })
  maxLegs?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'forwardBars 必须是整数' })
  @Min(1, { message: 'forwardBars 最小为 1' })
  @Max(1000, { message: 'forwardBars 最大为 1000' })
  forwardBars?: number;
}
