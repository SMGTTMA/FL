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
  STRATEGY_LEVEL_GROUPS,
  StrategyBoundary,
  StrategyLevelGroup,
} from '../constants/strategy-structure.constants';

export class UpdateStrategyKeyLevelDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  price?: number;

  @IsOptional()
  @IsIn(STRATEGY_LEVEL_GROUPS)
  levelGroup?: StrategyLevelGroup;

  @IsOptional()
  @IsIn(STRATEGY_BOUNDARIES)
  boundary?: StrategyBoundary;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
