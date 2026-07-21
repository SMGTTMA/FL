import { IsInt, Min, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 最小为 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须为整数' })
  @Min(1, { message: 'pageSize 最小为 1' })
  pageSize: number = 20;
}

export class PaginationResponseDto<T> {
  constructor(data: {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
  }) {
    Object.assign(this, data);
    this.list = data.list;
    this.total = data.total;
    this.page = data.page;
    this.pageSize = data.pageSize;
  }

  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  pageSize: number;

  @IsArray()
  list: T[];
}
