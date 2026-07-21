import { IsBoolean, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateExchangeConfigDto {
  @IsString()
  @IsNotEmpty({ message: '配置名称不能为空' })
  @Length(2, 50, { message: '配置名称长度必须在2-50个字符之间' })
  configName: string;

  @IsString()
  @IsNotEmpty({ message: 'API Key不能为空' })
  apiKey: string;

  @IsString()
  @IsNotEmpty({ message: 'Secret Key不能为空' })
  secretKey: string;

  @IsString()
  @IsNotEmpty({ message: 'Passphrase不能为空' })
  passphrase: string;

  @IsBoolean()
  isTestNet: boolean = false;
}