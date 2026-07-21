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

export class QueryStrategyMarketDirectionListDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  timeframe?: string;

  @IsOptional()
  @IsIn(STRATEGY_MARKET_DIRECTIONS)
  direction?: StrategyMarketDirectionType;
}
