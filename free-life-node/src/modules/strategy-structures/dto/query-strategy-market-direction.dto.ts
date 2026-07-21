import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QueryStrategyMarketDirectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  timeframe: string;
}
