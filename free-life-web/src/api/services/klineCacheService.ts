import apiClient from "../apiClient";

export const getKlineCache = () =>
  apiClient.post<any>({
    url: "/klineCache/getAllCache",
  });
