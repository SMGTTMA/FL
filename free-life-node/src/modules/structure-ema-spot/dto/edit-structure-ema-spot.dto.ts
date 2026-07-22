import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class EditStructureEmaSpotDto {
  @IsInt()
  @IsNotEmpty()
  strategyId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPositionSize?: number;

  @IsOptional()
  @IsString()
  configJson?: string;
}
