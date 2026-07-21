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
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { KlineEnv } from '@/modules/kline-cache/kline-cache.service';

/** 现金网格关键位回测参数 */
export class GetGridCashKeyPointsBacktestDto {
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

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'klineNum 必须是整数' })
  @Min(20, { message: 'klineNum 最小为 20' })
  @Max(2000, { message: 'klineNum 最大为 2000' })
  klineNum?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean({ message: 'includeKlines 必须是布尔值' })
  includeKlines?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'testCount 必须是整数' })
  @Min(1, { message: 'testCount 最小为 1' })
  @Max(10, { message: 'testCount 最大为 10' })
  testCount?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'priceTolerance 必须是数字' })
  @Min(0.0001, { message: 'priceTolerance 最小为 0.0001' })
  @Max(0.05, { message: 'priceTolerance 最大为 0.05' })
  priceTolerance?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'atrPeriod 必须是整数' })
  @Min(2, { message: 'atrPeriod 最小为 2' })
  @Max(100, { message: 'atrPeriod 最大为 100' })
  atrPeriod?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'pivotWindow 必须是整数' })
  @Min(1, { message: 'pivotWindow 最小为 1' })
  @Max(20, { message: 'pivotWindow 最大为 20' })
  pivotWindow?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'reactionBars 必须是整数' })
  @Min(1, { message: 'reactionBars 最小为 1' })
  @Max(20, { message: 'reactionBars 最大为 20' })
  reactionBars?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'minReactionAtr 必须是数字' })
  @Min(0.1, { message: 'minReactionAtr 最小为 0.1' })
  @Max(10, { message: 'minReactionAtr 最大为 10' })
  minReactionAtr?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'minTouchGap 必须是整数' })
  @Min(1, { message: 'minTouchGap 最小为 1' })
  @Max(100, { message: 'minTouchGap 最大为 100' })
  minTouchGap?: number;
}
