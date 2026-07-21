import { Breadcrumb, type BreadcrumbProps, type GetProp } from "antd";
import { useMemo } from "react";
import { Link, useMatches } from "react-router";

import { Iconify } from "@/components/icon";
import { useDashboard } from "@/contexts/dashboard";
import { menuFilter } from "@/router/utils";
import type { AppRouteObject } from "#/router";

type MenuItem = NonNullable<GetProp<BreadcrumbProps, "items">[number]>;

/**
 * 动态面包屑解决方案：https://github.com/MinjieChang/myblog/issues/29
 */
export default function BreadCrumb() {
  const matches = useMatches();
  const { routes } = useDashboard();

  const breadCrumbs = useMemo(() => {
    // 获取过滤后的菜单路由
    const menuRoutes = menuFilter(routes);

    // 获取当前路径匹配的所有路径（除了根路径）
    const paths = matches
      .filter((item) => item.pathname !== "/")
      .map((item) => item.pathname);

    // 递归查找路由
    const findRouteByPath = (
      routes: AppRouteObject[],
      path: string
    ): AppRouteObject | null => {
      for (const route of routes) {
        if (route.meta?.key === path) return route;
        if (route.children?.length) {
          const found = findRouteByPath(route.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    // 构建面包屑项
    return paths
      .map((path): MenuItem | null => {
        const route = findRouteByPath(menuRoutes, path);
        if (!route?.meta) return null;

        const { key, label } = route.meta;
        const children =
          route.children?.filter(
            (item: AppRouteObject) => !item.meta?.hideMenu
          ) ?? [];

        return {
          key,
          title: label,
          ...(children.length > 0 && {
            menu: {
              items: children.map((item: AppRouteObject) => ({
                key: item.meta?.key,
                label: item.meta?.key ? (
                  <Link to={item.meta.key}>{item.meta.label}</Link>
                ) : null,
              })),
            },
          }),
        };
      })
      .filter((item): item is MenuItem => item !== null);
  }, [matches, routes]);

  return (
    <Breadcrumb
      items={breadCrumbs}
      className="!text-sm"
      separator={<Iconify icon="ph:dot-duotone" />}
    />
  );
}
