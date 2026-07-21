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

export class UpdateStrategyStructureLineDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsIn(STRATEGY_LINE_GROUPS)
  lineGroup?: StrategyLineGroup;

  @IsOptional()
  @IsIn(STRATEGY_BOUNDARIES)
  boundary?: StrategyBoundary;

  @IsOptional()
  @IsInt()
  @Min(1)
  p1Time?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  p1Price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  p2Time?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  p2Price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
