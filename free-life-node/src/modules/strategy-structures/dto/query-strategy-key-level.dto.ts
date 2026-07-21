import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  STRATEGY_LEVEL_GROUPS,
  StrategyLevelGroup,
} from '../constants/strategy-structure.constants';

export class QueryStrategyKeyLevelDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsNotEmpty()
  symbol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsNotEmpty()
  timeframe?: string;

  @IsOptional()
  @IsIn(STRATEGY_LEVEL_GROUPS)
  levelGroup?: StrategyLevelGroup;
}
