import { Divider, type MenuProps } from "antd";
import Dropdown, { type DropdownProps } from "antd/es/dropdown/dropdown";
import React from "react";
import { NavLink } from "react-router";

import { IconButton } from "@/components/icon";
import { useRouter } from "@/router/hooks";
import { useUserActions, useUserInfo } from "@/store/userStore";
import { useTheme } from "@/theme/hooks";

/**
 * Account Dropdown
 */
export default function AccountDropdown() {
  const { replace } = useRouter();
  const { username } = useUserInfo();
  const { clearUserInfoAndToken } = useUserActions();
  const logout = () => {
    try {
      clearUserInfoAndToken();
    } catch (error) {
      console.log(error);
    } finally {
      replace("/login");
    }
  };
  const {
    themeVars: { colors, borderRadius, shadows },
  } = useTheme();

  const contentStyle: React.CSSProperties = {
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.dropdown,
  };

  const menuStyle: React.CSSProperties = {
    boxShadow: "none",
  };

  const dropdownRender: DropdownProps["dropdownRender"] = (menu) => (
    <div style={contentStyle}>
      <div className="flex flex-col items-start p-4">
        <div>{username}</div>
      </div>
      <Divider style={{ margin: 0 }} />
      {React.cloneElement(menu as React.ReactElement, { style: menuStyle })}
    </div>
  );

  const items: MenuProps["items"] = [
    {
      label: (
        <NavLink to="https://docs-admin.slashspaces.com/" target="_blank">
          框架文档
        </NavLink>
      ),
      key: "0",
    },
    { type: "divider" },
    {
      label: (
        <button className="font-bold text-warning" type="button">
          退出登录
        </button>
      ),
      key: "4",
      onClick: logout,
    },
  ];

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      dropdownRender={dropdownRender}
    >
      <IconButton className="h-10 w-10 transform-none px-0 hover:scale-105">
        <img
          className="h-8 w-8 rounded-full"
          src={
            "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
          }
          alt=""
        />
      </IconButton>
    </Dropdown>
  );
}
