import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMatches, Outlet } from "react-router";
import { useDashboard } from "@/contexts/dashboard";
import { useTabOperations } from "../hooks/use-tab-operations";
import type { KeepAliveTab, MultiTabsContextType } from "../types";
import type { AppRouteObject, RouteMeta } from "#/router";

const MultiTabsContext = createContext<MultiTabsContextType>({
  tabs: [],
  activeTabRoutePath: "",
  setTabs: () => {},
  closeTab: () => {},
  closeOthersTab: () => {},
  closeAll: () => {},
  closeLeft: () => {},
  closeRight: () => {},
  refreshTab: () => {},
});

// 检查路径是否匹配动态路由
function isPathMatchRoute(path: string, routePath: string): boolean {
  // 将动态参数部分替换为正则表达式
  const pattern = routePath.replace(/:[^/]+/g, "[^/]+");
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(path);
}

export function MultiTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<KeepAliveTab[]>([]);
  const { routes } = useDashboard();
  const matches = useMatches();

  // 获取当前路由的 Meta 信息
  const currentRouteMeta = useMemo(():
    | (RouteMeta & { outlet?: React.ReactNode })
    | null => {
    const currentMatch = matches[matches.length - 1];
    if (!currentMatch) return null;

    // 递归查找当前路由
    const findRoute = (
      routes: AppRouteObject[],
      pathname: string
    ): AppRouteObject | null => {
      for (const route of routes) {
        // 检查路径是否匹配（包括动态路由）
        if (route.path && isPathMatchRoute(pathname, route.path)) {
          return route;
        }
        if (route.children?.length) {
          const found = findRoute(route.children, pathname);
          if (found) return found;
        }
      }
      return null;
    };

    const currentRoute = findRoute(routes, currentMatch.pathname);
    if (!currentRoute?.meta) return null;

    return {
      ...currentRoute.meta,
      outlet: <Outlet />,
    };
  }, [matches, routes]);

  const activeTabRoutePath = useMemo(() => {
    if (!currentRouteMeta) return "";
    const { key } = currentRouteMeta;
    return key;
  }, [currentRouteMeta]);

  const operations = useTabOperations(tabs, setTabs, activeTabRoutePath);

  useEffect(() => {
    if (!currentRouteMeta) return;

    setTabs((prev) => {
      const filtered = prev;

      const { key } = currentRouteMeta;
      const { outlet: children } = currentRouteMeta;

      const isExisted = filtered.find((item) => item.key === key);
      if (!isExisted) {
        return [
          ...filtered,
          {
            ...currentRouteMeta,
            key,
            children,
            timeStamp: new Date().getTime().toString(),
          },
        ];
      }

      return filtered;
    });
  }, [currentRouteMeta]);

  const contextValue = useMemo(
    () => ({
      tabs,
      activeTabRoutePath,
      setTabs,
      ...operations,
    }),
    [tabs, activeTabRoutePath, operations]
  );

  return (
    <MultiTabsContext.Provider value={contextValue}>
      {children}
    </MultiTabsContext.Provider>
  );
}

export function useMultiTabsContext() {
  return useContext(MultiTabsContext);
}
