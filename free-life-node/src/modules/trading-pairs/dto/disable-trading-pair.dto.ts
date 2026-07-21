import { IsNumber } from 'class-validator';

export class DisableTradingPairDto {
  @IsNumber()
  id: number;
}