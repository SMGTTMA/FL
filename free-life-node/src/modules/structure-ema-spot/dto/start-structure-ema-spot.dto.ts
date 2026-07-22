import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class StartStructureEmaSpotDto {
  @IsString()
  @Matches(/^[A-Z0-9]+\/[A-Z0-9]+$/, {
    message: '交易对格式不正确，正确格式如：BTC/USDT',
  })
  symbol: string;

  @IsNumber()
  @Min(0)
  totalPositionSize: number;

  @IsInt()
  @IsNotEmpty()
  exchangeConfigId: number;

  @IsOptional()
  @IsString()
  configJson?: string;
}
