import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  symbol: string;

  @IsEnum(['limit', 'market'])
  type: 'limit' | 'market';

  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  price?: number;
}