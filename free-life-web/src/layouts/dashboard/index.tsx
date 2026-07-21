import { Layout } from "antd";
import { type CSSProperties, Suspense, useEffect, useMemo } from "react";

import { useSettings } from "@/store/settingStore";
import { cn } from "@/utils";

import Header from "./header";
import Main from "./main";

import { down, useMediaQuery } from "@/hooks";
import { ThemeLayout } from "#/enum";
import { NAV_COLLAPSED_WIDTH, NAV_WIDTH } from "./config";
import type { AppRouteObject } from "#/router";
import { DashboardProvider } from "@/contexts/dashboard";
import Nav from "./nav";
import { useFetchUserInfo } from "@/store/userStore";
// import {
//   useFetchStrategies,
//   useFetchStrategyParameters,
// } from "@/store/strategyStore";

function useGlobalRequests() {
  const { fetch } = useFetchUserInfo();
  // const { fetch: fetchStrategies } = useFetchStrategies();
  // const { fetch: fetchStrategyParameters } = useFetchStrategyParameters();

  useEffect(() => {
    // 获取用户信息
    fetch();
    // 获取策略列表
    // fetchStrategies();
    // 获取策略参数配置
    // fetchStrategyParameters();
    // 其他需要在登录后全局请求的接口;
  }, []);
}

function DashboardLayout({ routes }: { routes: AppRouteObject[] }) {
  const { themeLayout } = useSettings();
  const mobileOrTablet = useMediaQuery(down("md"));

  useGlobalRequests();

  const layoutClassName = useMemo(() => {
    return cn(
      "flex h-screen overflow-hidden",
      themeLayout === ThemeLayout.Horizontal ? "flex-col" : "flex-row"
    );
  }, [themeLayout]);

  const getPaddingLeft = () => {
    if (mobileOrTablet) return 0;
    if (themeLayout === ThemeLayout.Horizontal) return 0;
    if (themeLayout === ThemeLayout.Mini) return NAV_COLLAPSED_WIDTH;
    return NAV_WIDTH;
  };

  const secondLayoutStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    paddingLeft: getPaddingLeft(),
  };

  return (
    <DashboardProvider value={{ routes }}>
      <Layout className={layoutClassName}>
        {/* TODO: 添加loading */}
        <Suspense fallback={<div>Loading...</div>}>
          <Layout style={secondLayoutStyle}>
            <Header />
            <Nav />
            <Main />
          </Layout>
        </Suspense>
      </Layout>
    </DashboardProvider>
  );
}

export default DashboardLayout;
