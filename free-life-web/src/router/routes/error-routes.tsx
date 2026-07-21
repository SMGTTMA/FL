import { Suspense, lazy } from "react";
import { Outlet } from "react-router";

import SimpleLayout from "@/layouts/simple";

import type { AppRouteObject } from "#/router";

const Page404 = lazy(() => import("@/pages/error/Page404"));

/**
 * error routes
 */
export const ERROR_ROUTE: AppRouteObject = {
  element: (
    <SimpleLayout>
      {/* TODO: 添加loading */}
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </SimpleLayout>
  ),
  children: [{ path: "404", element: <Page404 /> }],
};
