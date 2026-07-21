import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  STRATEGY_BOUNDARIES,
  STRATEGY_LEVEL_GROUPS,
  StrategyBoundary,
  StrategyLevelGroup,
} from '../constants/strategy-structure.constants';

export class BatchCreateStrategyKeyLevelItemDto {
  @IsNumber()
  @Min(0.00000001)
  price: number;

  @IsIn(STRATEGY_LEVEL_GROUPS)
  levelGroup: StrategyLevelGroup;

  @IsOptional()
  @IsIn(STRATEGY_BOUNDARIES)
  boundary?: StrategyBoundary;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class BatchCreateStrategyKeyLevelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  timeframe: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchCreateStrategyKeyLevelItemDto)
  items: BatchCreateStrategyKeyLevelItemDto[];
}
