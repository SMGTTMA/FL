import type { MenuProps } from "antd";
import type { AppRouteObject } from "#/router";

const { VITE_SUPER_ADMIN_ID } = import.meta.env;

type MenuItemType = Required<MenuProps>["items"][number];

export function convertRoutesToMenuItems(
  routes: AppRouteObject[],
  userId?: number | string
): MenuItemType[] {
  return routes
    .map((route) => {
      const { meta, isSubmenu, children } = route;
      if (!meta || isSubmenu) return null;
      if (
        meta.superAdminExclusive &&
        !String(VITE_SUPER_ADMIN_ID).split(",").includes(String(userId))
      ) {
        return null;
      }

      const menuItem = {
        key: meta.key,
        label: meta.label,
        icon: meta.icon,
        disabled: meta.disabled,
        children: children?.length
          ? convertRoutesToMenuItems(children)
          : undefined,
      } as MenuItemType;

      return menuItem;
    })
    .filter(Boolean) as MenuItemType[];
}
