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

export class GetKeyPointsV3BacktestDto {
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
  @IsNumber({}, { message: 'priceTolerance 必须是数字' })
  @Min(0.0001, { message: 'priceTolerance 最小为 0.0001' })
  @Max(0.05, { message: 'priceTolerance 最大为 0.05' })
  priceTolerance?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'reactionLookahead 必须是整数' })
  @Min(1, { message: 'reactionLookahead 最小为 1' })
  @Max(20, { message: 'reactionLookahead 最大为 20' })
  reactionLookahead?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'reactionThreshold 必须是数字' })
  @Min(0.001, { message: 'reactionThreshold 最小为 0.001' })
  @Max(0.2, { message: 'reactionThreshold 最大为 0.2' })
  reactionThreshold?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'minTouchGap 必须是整数' })
  @Min(1, { message: 'minTouchGap 最小为 1' })
  @Max(30, { message: 'minTouchGap 最大为 30' })
  minTouchGap?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'recentWindowRatio 必须是数字' })
  @Min(0.1, { message: 'recentWindowRatio 最小为 0.1' })
  @Max(0.8, { message: 'recentWindowRatio 最大为 0.8' })
  recentWindowRatio?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'obviousReactionMultiplier 必须是数字' })
  @Min(1, { message: 'obviousReactionMultiplier 最小为 1' })
  @Max(10, { message: 'obviousReactionMultiplier 最大为 10' })
  obviousReactionMultiplier?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean({ message: 'applyRegimeFilter 必须是布尔值' })
  applyRegimeFilter?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'regimeBreakoutBuffer 必须是数字' })
  @Min(0.0001, { message: 'regimeBreakoutBuffer 最小为 0.0001' })
  @Max(0.05, { message: 'regimeBreakoutBuffer 最大为 0.05' })
  regimeBreakoutBuffer?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'regimeBreakoutConfirmBars 必须是整数' })
  @Min(1, { message: 'regimeBreakoutConfirmBars 最小为 1' })
  @Max(20, { message: 'regimeBreakoutConfirmBars 最大为 20' })
  regimeBreakoutConfirmBars?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'regimeRecentPivotBars 必须是整数' })
  @Min(1, { message: 'regimeRecentPivotBars 最小为 1' })
  @Max(120, { message: 'regimeRecentPivotBars 最大为 120' })
  regimeRecentPivotBars?: number;
}

