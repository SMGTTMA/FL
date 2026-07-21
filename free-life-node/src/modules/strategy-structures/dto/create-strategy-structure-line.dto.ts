import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  STRATEGY_BOUNDARIES,
  STRATEGY_LINE_GROUPS,
  StrategyBoundary,
  StrategyLineGroup,
} from '../constants/strategy-structure.constants';

export class CreateStrategyStructureLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  timeframe: string;

  @IsIn(STRATEGY_LINE_GROUPS)
  lineGroup: StrategyLineGroup;

  @IsOptional()
  @IsIn(STRATEGY_BOUNDARIES)
  boundary?: StrategyBoundary;

  @IsInt()
  @Min(1)
  p1Time: number;

  @IsNumber()
  @Min(0.00000001)
  p1Price: number;

  @IsInt()
  @Min(1)
  p2Time: number;

  @IsNumber()
  @Min(0.00000001)
  p2Price: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
