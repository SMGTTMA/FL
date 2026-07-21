import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryActiveSpotMartinTradeDto extends PaginationDto {
  @IsOptional()
  @IsString()
  strategyName?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsEnum(['buy', 'sell'])
  side?: 'buy' | 'sell';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  isPriceDeviated?: boolean;

  @IsOptional()
  @IsString()
  orderId?: string;
}