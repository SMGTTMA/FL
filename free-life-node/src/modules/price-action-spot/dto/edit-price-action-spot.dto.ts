import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PriceActionCheckInterval } from '../types/price-action-spot-config.type';

export class EditPriceActionSpotDto {
  /** 策略ID */
  @IsInt()
  @IsNotEmpty()
  strategyId: number;

  /** 每单投入资金（USDT） */
  @IsOptional()
  @IsNumber()
  @Min(1)
  singleOrderAmount?: number;

  /** 最多投入单数 */
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOrderCount?: number;

  /** 小周期 */
  @IsOptional()
  @IsEnum(PriceActionCheckInterval, {
    message: 'shortTimeframe 参数不合法，仅支持：1h, 4h, 1d',
  })
  shortTimeframe?: PriceActionCheckInterval;

  /** 大周期 */
  @IsOptional()
  @IsEnum(PriceActionCheckInterval, {
    message: 'longTimeframe 参数不合法，仅支持：1h, 4h, 1d',
  })
  longTimeframe?: PriceActionCheckInterval;

  /** 盈利收益点 */
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  profitPoint?: number;
}
