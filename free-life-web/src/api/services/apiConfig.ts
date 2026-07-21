import apiClient from "../apiClient";
import { AddOKXApiConfigParams, OKXApiConfig } from "../types/apiConfigTypes";

export const getOKXApiConfig = () =>
  apiClient.post<OKXApiConfig[]>({ url: "/exchange/getConfig" });

export const addOKXApiConfig = (data: AddOKXApiConfigParams) =>
  apiClient.post<OKXApiConfig>({ url: "/exchange/addConfig", data });

export const deleteOKXApiConfig = (data: { id: number }) =>
  apiClient.post<null>({ url: "/exchange/deleteConfig", data });
