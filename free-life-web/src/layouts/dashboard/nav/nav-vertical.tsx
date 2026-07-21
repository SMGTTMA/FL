import { Layout, Menu, type MenuProps } from "antd";
import { useMemo, useState } from "react";
import { useMatches, useNavigate, useLocation } from "react-router";

import Scrollbar from "@/components/scrollbar";
import { menuFilter } from "@/router/utils";
import { useSettingActions, useSettings } from "@/store/settingStore";
import { useDashboard } from "@/contexts/dashboard";
import { convertRoutesToMenuItems } from "@/utils/routeHelper";

import { NAV_WIDTH } from "../config";
import NavLogo from "./nav-logo";
import { ThemeLayout, ThemeMode } from "#/enum";
import { useUserInfo } from "@/store/userStore";

const { Sider } = Layout;

type Props = {
  closeSideBarDrawer?: () => void;
};

export default function NavVertical(props: Props) {
  const navigate = useNavigate();
  const matches = useMatches();
  const { pathname } = useLocation();

  const settings = useSettings();
  const { themeLayout, themeMode, darkSidebar } = settings;
  const { setSettings } = useSettingActions();
  const { routes } = useDashboard();
  const { id } = useUserInfo();

  const collapsed = useMemo(
    () => themeLayout === ThemeLayout.Mini,
    [themeLayout]
  );

  // 获取菜单列表
  const menuList = useMemo(() => {
    const menuRoutes = menuFilter(routes);
    return convertRoutesToMenuItems(menuRoutes, id);
  }, [routes, id]);

  const [selectedKeys, setSelectedKeys] = useState([pathname]);
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    if (!collapsed) {
      const keys = matches
        .filter(
          (match) => match.pathname !== "/" && match.pathname !== pathname
        )
        .map((match) => match.pathname);
      return keys;
    }
    return [];
  });

  const handleToggleCollapsed = () => {
    setSettings({
      ...settings,
      themeLayout: collapsed ? ThemeLayout.Vertical : ThemeLayout.Mini,
    });
    if (collapsed) {
      const keys = matches
        .filter(
          (match) => match.pathname !== "/" && match.pathname !== pathname
        )
        .map((match) => match.pathname);
      // hack resolution of https://github.com/d3george/slash-admin/issues/104
      setTimeout(() => {
        setOpenKeys(keys);
      }, 0);
      return;
    }
  };

  const onClick: MenuProps["onClick"] = ({ key }) => {
    setSelectedKeys([key]);
    navigate(key);
    props?.closeSideBarDrawer?.();
  };

  const handleOpenChange: MenuProps["onOpenChange"] = (keys) => {
    if (!settings.accordion) {
      setOpenKeys(keys);
      return;
    }

    // 手风琴模式
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    // 收起
    if (!latestOpenKey) {
      const closedKey = openKeys.find((key) => !keys.includes(key));
      if (closedKey) {
        // 只移除被收起的菜单，保留其他展开状态
        setOpenKeys(openKeys.filter((key) => key !== closedKey));
      }
      return;
    }
    // 展开
    const getKeyLevel = (key: string) => (key.match(/\//g) || []).length;
    const latestKeyLevel = getKeyLevel(latestOpenKey);
    // 过滤掉同层级的其他 key，保留不同层级的 key
    const newOpenKeys = openKeys.filter(
      (key) => getKeyLevel(key) !== latestKeyLevel
    );

    // 找到当前打开菜单的所有父级路径
    const parentKeys = matches
      .filter(
        (match) =>
          latestOpenKey.startsWith(match.pathname) &&
          match.pathname !== "/" &&
          match.pathname !== latestOpenKey
      )
      .map((match) => match.pathname);

    setOpenKeys([...new Set([...parentKeys, ...newOpenKeys, latestOpenKey])]);
  };

  const sidebarTheme = useMemo(() => {
    if (themeMode === ThemeMode.Dark) {
      return darkSidebar ? "light" : "dark";
    }
    return darkSidebar ? "dark" : "light";
  }, [themeMode, darkSidebar]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={NAV_WIDTH}
      theme={sidebarTheme}
      className="!fixed left-0 top-0 h-screen border-r border-dashed border-border"
    >
      <div className="flex h-full flex-col">
        <NavLogo collapsed={collapsed} onToggle={handleToggleCollapsed} />

        <Scrollbar>
          <Menu
            mode="inline"
            items={menuList}
            theme={sidebarTheme}
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            className="!border-none"
            onClick={onClick}
          />
        </Scrollbar>
      </div>
    </Sider>
  );
}
