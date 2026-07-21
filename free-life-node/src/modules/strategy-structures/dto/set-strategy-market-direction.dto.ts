import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  STRATEGY_MARKET_DIRECTIONS,
  StrategyMarketDirectionType,
} from '../constants/strategy-structure.constants';

export class SetStrategyMarketDirectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  timeframe: string;

  @IsIn(STRATEGY_MARKET_DIRECTIONS)
  direction: StrategyMarketDirectionType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
