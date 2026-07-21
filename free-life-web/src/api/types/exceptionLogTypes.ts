/**
 * 异常日志 DTO
 */
export type ExceptionLogDTO = {
  /** 日志ID */
  id: number;
  /** 请求URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 状态码 */
  statusCode: number;
  /** 异常信息 */
  message: string;
  /** 异常堆栈，可能为 null */
  stack: string | null;
  /** 用户ID，可能为 null */
  userId: number | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};
