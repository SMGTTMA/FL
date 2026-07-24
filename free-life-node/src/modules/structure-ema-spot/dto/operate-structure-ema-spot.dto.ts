import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class OperateStructureEmaSpotDto {
  @IsInt()
  @IsNotEmpty()
  strategyId: number;
}

export class ManualExitStructureEmaSpotDto extends OperateStructureEmaSpotDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  tradeIds: number[];

  @IsNumber()
  @IsPositive()
  exitPrice: number;

  @IsOptional()
  @IsBoolean()
  pauseEntry?: boolean;
}

export class ManualEntryStructureEmaSpotDto extends OperateStructureEmaSpotDto {
  @IsNumber()
  @IsPositive()
  entryPrice: number;
}
