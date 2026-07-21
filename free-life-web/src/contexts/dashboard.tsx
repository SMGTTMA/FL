import { createContext, useContext } from "react";
import type { AppRouteObject } from "#/router";

// 定义 Context 的数据类型
export interface DashboardContextValue {
  routes: AppRouteObject[];
  // 这里可以添加更多的属性
  // 例如：
  // currentRoute?: AppRouteObject;
  // breadcrumbs?: string[];
  // permissions?: string[];
  // userMenus?: MenuItem[];
}

// 创建 Context 的默认值
const defaultContextValue: DashboardContextValue = {
  routes: [],
};

// 创建 Context
export const DashboardContext =
  createContext<DashboardContextValue>(defaultContextValue);

// 创建 hook 以便子组件使用
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

// 创建 Provider 组件
export interface DashboardProviderProps {
  children: React.ReactNode;
  value: Partial<DashboardContextValue>;
}

export const DashboardProvider = ({
  children,
  value,
}: DashboardProviderProps) => {
  const contextValue = {
    ...defaultContextValue,
    ...value,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};
