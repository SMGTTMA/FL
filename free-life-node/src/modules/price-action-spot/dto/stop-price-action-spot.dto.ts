import { IsInt, IsNotEmpty } from 'class-validator';

export class StopPriceActionSpotDto {
  /** 策略ID */
  @IsInt()
  @IsNotEmpty()
  strategyId: number;
}

