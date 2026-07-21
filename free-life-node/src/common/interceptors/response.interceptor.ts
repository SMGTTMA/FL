import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseDto<T>> {
    return next.handle().pipe(
      map(data => {
        // 如果已经是 ResponseDto 类型，直接返回
        if (data instanceof ResponseDto) {
          return data;
        }
        // 否则包装成 ResponseDto
        return ResponseDto.success(data);
      }),
    );
  }
}