import type { ReactNode } from "react";
import type { RouteObject } from "react-router";

export interface RouteMeta {
  /**
   * antd menu selectedKeys
   */
  key: string;
  /**
   * menu label, i18n
   */
  label: string;
  /**
   * menu prefix icon
   */
  icon?: ReactNode;
  /**
   * disable in menu
   */
  disabled?: boolean;
  /**
   * super admin exclusive
   */
  superAdminExclusive?: boolean;
}
export type AppRouteObject = {
  order?: number;
  meta?: RouteMeta;
  children?: AppRouteObject[];
  isSubmenu?: boolean;
} & Omit<RouteObject, "children">;
