import { IsNotEmpty, IsInt } from 'class-validator';

export class StopGridDto {
  // 策略ID
  @IsInt()
  @IsNotEmpty()
  strategyId: number;
}
