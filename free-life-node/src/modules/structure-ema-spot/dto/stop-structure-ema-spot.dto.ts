import { IsInt, IsNotEmpty } from 'class-validator';

export class StopStructureEmaSpotDto {
  @IsInt()
  @IsNotEmpty()
  strategyId: number;
}
