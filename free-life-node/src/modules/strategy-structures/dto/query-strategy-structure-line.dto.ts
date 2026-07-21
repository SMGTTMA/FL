import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  STRATEGY_LINE_GROUPS,
  StrategyLineGroup,
} from '../constants/strategy-structure.constants';

export class QueryStrategyStructureLineDto {
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
  @IsIn(STRATEGY_LINE_GROUPS)
  lineGroup?: StrategyLineGroup;
}
