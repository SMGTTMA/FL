import { type CSSProperties } from "react";

import { IconButton, SvgIcon } from "@/components/icon";
import Logo from "@/components/logo";
import { useSettings } from "@/store/settingStore";

import AccountDropdown from "../components/account-dropdown";
import BreadCrumb from "../components/bread-crumb";
import SettingButton from "../components/setting-button";

import { themeVars } from "@/theme/theme.css";
import { cn } from "@/utils";
import { rgbAlpha } from "@/utils/theme";
import { ThemeLayout } from "#/enum";
import { HEADER_HEIGHT } from "./config";

export default function Header() {
  const { themeLayout, breadCrumb } = useSettings();

  const headerStyle: CSSProperties = {
    borderBottom:
      themeLayout === ThemeLayout.Horizontal
        ? `1px dashed ${rgbAlpha(
            themeVars.colors.palette.gray["500Channel"],
            0.2
          )}`
        : "",
    backgroundColor: rgbAlpha(themeVars.colors.background.defaultChannel, 0.9),
    width: "100%",
  };

  return (
    <>
      <header
        className={cn(
          themeLayout === ThemeLayout.Horizontal
            ? "relative"
            : "sticky top-0 right-0 left-auto"
        )}
        style={headerStyle}
      >
        <div
          className="flex flex-grow items-center justify-between px-4 text-gray backdrop-blur xl:px-6 2xl:px-10"
          style={{
            height: HEADER_HEIGHT,
            transition: "height 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
          }}
        >
          <div className="flex items-baseline">
            {themeLayout !== ThemeLayout.Horizontal ? (
              <IconButton className="h-10 w-10 md:hidden">
                <SvgIcon icon="ic-menu" size="24" />
              </IconButton>
            ) : (
              <Logo />
            )}
            <div className="ml-4 hidden md:block">
              {breadCrumb ? <BreadCrumb /> : null}
            </div>
          </div>

          <div className="flex">
            <SettingButton />
            <AccountDropdown />
          </div>
        </div>
      </header>
    </>
  );
}
