import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PriceActionCheckInterval } from '../types/price-action-spot-config.type';

export class StartPriceActionSpotDto {
  /** 交易对 */
  @IsString()
  @Matches(/^[A-Z0-9]+\/[A-Z0-9]+$/, {
    message: '交易对格式不正确，正确格式如：BTC/USDT',
  })
  symbol: string;

  /** 交易所配置ID */
  @IsNotEmpty()
  @IsNumber()
  exchangeConfigId: number;

  /** 每单投入资金（USDT） */
  @IsNumber()
  @Min(1)
  singleOrderAmount: number;

  /** 最多投入单数 */
  @IsNumber()
  @Min(1)
  maxOrderCount: number;

  /** 小周期 */
  @IsEnum(PriceActionCheckInterval, {
    message: 'shortTimeframe 参数不合法，仅支持：1h, 4h, 1d',
  })
  shortTimeframe: PriceActionCheckInterval;

  /** 大周期 */
  @IsEnum(PriceActionCheckInterval, {
    message: 'longTimeframe 参数不合法，仅支持：1h, 4h, 1d',
  })
  longTimeframe: PriceActionCheckInterval;

  /** 盈利收益点 */
  @IsNumber()
  @Min(0.0001)
  profitPoint: number;
}
