import { IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustPositionSizeDto {
  @IsInt({ message: 'id 必须为整数' })
  id: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'totalPositionSize 必须为数字' })
  @Min(0, { message: 'totalPositionSize 不能为负' })
  totalPositionSize: number;
}