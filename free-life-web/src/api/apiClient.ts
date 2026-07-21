import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosResponse,
} from "axios";

import userStore from "@/store/userStore";

import { toast } from "sonner";
import type { Result } from "#/api";
import { ResultEnum } from "#/enum";

// 创建 axios 实例
const axiosInstance = axios.create({
  // baseURL 通过环境变量 VITE_API_BASE_URL 配置，方便区分开发和生产环境
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

// 请求拦截
axiosInstance.interceptors.request.use(
  (config) => {
    // 在请求被发送之前做些什么
    const { userToken } = userStore.getState();

    if (userToken.accessToken) {
      config.headers.Authorization = `Bearer ${userToken.accessToken}`;
    }
    return config;
  },
  (error) => {
    // 请求错误时做些什么
    return Promise.reject(error);
  }
);

// 响应拦截
axiosInstance.interceptors.response.use(
  (res: AxiosResponse<Result>) => {
    if (!res.data) throw new Error("请求失败，请稍后重试");

    const { code, data, message } = res.data;
    // 业务请求成功
    const hasSuccess =
      data && Reflect.has(res.data, "code") && code === ResultEnum.SUCCESS;
    if (hasSuccess) {
      return data;
    }

    // 业务请求错误
    throw new Error(message || "请求失败，请稍后重试");
  },
  (error: AxiosError<Result>) => {
    const { response, message } = error || {};

    const errMsg = response?.data?.message || message || "操作失败，系统异常！";
    toast.error(errMsg, {
      position: "top-center",
    });

    if (errMsg === "ReLogin") {
      userStore.getState().actions.clearUserInfoAndToken();
      // 使用 window.location.replace 完全替换当前页面
      window.location.replace("/#/login");
    }

    return Promise.reject(error);
  }
);

class APIClient {
  get<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: "GET" });
  }

  post<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: "POST" });
  }

  put<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: "PUT" });
  }

  delete<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, method: "DELETE" });
  }

  request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      axiosInstance
        .request<any, AxiosResponse<Result>>(config)
        .then((res: AxiosResponse<Result>) => {
          resolve(res as unknown as Promise<T>);
        })
        .catch((e: Error | AxiosError) => {
          reject(e);
        });
    });
  }
}
export default new APIClient();
