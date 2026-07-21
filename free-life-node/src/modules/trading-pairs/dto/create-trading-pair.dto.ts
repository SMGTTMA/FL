import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateTradingPairDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  baseAsset: string;

  @IsString()
  @IsNotEmpty()
  quoteAsset: string;

  @IsString()
  @IsIn(['spot', 'contract'])
  type: 'spot' | 'contract';

  @IsString()
  @IsNotEmpty()
  exchangeName: string;
}