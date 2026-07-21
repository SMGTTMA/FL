import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRejectedOrderDto } from './create-rejected-order.dto';

export class CreateBatchRejectedOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRejectedOrderDto)
  @ArrayMinSize(1, { message: '至少需要一条记录' })
  @ArrayMaxSize(100, { message: '最多只能批量创建100条记录' })
  orders: CreateRejectedOrderDto[];
}