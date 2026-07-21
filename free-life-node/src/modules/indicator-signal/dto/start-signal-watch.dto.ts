import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class StartSignalWatchDto {
  @IsNotEmpty({ message: '交易对不能为空' })
  @IsString()
  symbol: string;

  @IsNotEmpty({ message: '交易所配置ID不能为空' })
  @IsNumber()
  exchangeConfigId: number;
}

