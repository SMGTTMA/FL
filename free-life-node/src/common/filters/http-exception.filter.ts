import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ResponseDto } from '../dto/response.dto';
import { Logger } from '@nestjs/common';
import { ExceptionLogService } from 'src/modules/exception-log/exception-log.service';
import { Request } from 'express';

// 异常过滤器
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  // 不需要记录日志的状态码
  private readonly excludedStatusCodes = [
    HttpStatus.NOT_FOUND,        // 404 - 资源未找到
    HttpStatus.BAD_REQUEST,      // 400 - 客户端请求错误
    HttpStatus.UNAUTHORIZED,     // 401 - 未授权
    HttpStatus.FORBIDDEN,        // 403 - 禁止访问
  ];

  constructor(private readonly exceptionLogService: ExceptionLogService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 如果是不需要记录日志的状态码，直接返回（400 时仍返回业务/校验的详细信息）
    if (this.excludedStatusCodes.includes(status)) {
      let message = 'Request failed';
      if (status === HttpStatus.NOT_FOUND) {
        message = 'Not Found';
      } else if (status === HttpStatus.BAD_REQUEST) {
        if (exception instanceof HttpException) {
          const res = exception.getResponse();
          if (typeof res === 'string') message = res;
          else if (typeof res === 'object' && res && 'message' in res) {
            message = Array.isArray((res as any).message)
              ? (res as any).message[0]
              : (res as any).message;
          } else message = exception.message;
        } else {
          message = 'Bad Request';
        }
      } else if (status === HttpStatus.UNAUTHORIZED) {
        message = 'Unauthorized';
      } else if (status === HttpStatus.FORBIDDEN) {
        message = 'Forbidden';
      }

      const errorResponse = ResponseDto.error(message, status);
      response.status(status).send(errorResponse);
      return;
    }

    // 获取详细的错误信息
    let message = 'Internal server error';
    let stack = '';
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res && 'message' in res) {
        if (Array.isArray((res as any).message)) {
          message = (res as any).message[0];
        } else {
          message = (res as any).message;
        }
      } else {
        message = exception.message;
      }
      stack = exception.stack || '';
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack || '';
    }

    // 获取 userId（如果有）
    const userId = (request as any).user?.id ?? null;

    // 写入异常日志
    await this.exceptionLogService.create({
      url: request.url,
      method: request.method,
      statusCode: status,
      message: String(message),
      stack,
      userId,
    });

    const errorResponse = ResponseDto.error(message, status);

    // 使用 logger 替代 console.log
    const logger = new Logger('HttpExceptionFilter');
    logger.error(
      `请求异常 - ${request.method} ${request.url}\n错误信息: ${message}`,
    );

    response.status(status).send(errorResponse);
  }
}