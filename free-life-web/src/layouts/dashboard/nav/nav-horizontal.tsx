import { Menu, type MenuProps } from "antd";
import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router";

import { useDashboard } from "@/contexts/dashboard";
import { themeVars } from "@/theme/theme.css";
import { NAV_HORIZONTAL_HEIGHT } from "../config";
import { convertRoutesToMenuItems } from "@/utils/routeHelper";
import { useUserInfo } from "@/store/userStore";

export default function NavHorizontal() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { routes } = useDashboard();
  const { id } = useUserInfo();

  const menuList = useMemo(() => {
    return convertRoutesToMenuItems(routes, id);
  }, [routes, id]);

  const selectedKeys = useMemo(() => [pathname], [pathname]);

  const onClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  return (
    <div className="w-screen" style={{ height: NAV_HORIZONTAL_HEIGHT }}>
      <Menu
        mode="horizontal"
        items={menuList}
        defaultOpenKeys={["/main"]}
        selectedKeys={selectedKeys}
        onClick={onClick}
        className="!border-none"
        style={{ background: themeVars.colors.background.default }}
      />
    </div>
  );
}
