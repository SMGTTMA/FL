import { BasePageDTO, BasePageRequest } from "#/entity";
import apiClient from "../apiClient";
import { ExceptionLogDTO } from "../types/exceptionLogTypes";

export const getExceptionLog = (data: BasePageRequest) =>
  apiClient.post<BasePageDTO<ExceptionLogDTO>>({
    url: "/exceptionLog/list",
    data,
  });
