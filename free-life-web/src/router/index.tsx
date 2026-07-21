import DashboardLayout from "@/layouts/dashboard";
import PageError from "@/pages/error/PageError";
import Login from "@/pages/login/Login";
import { routes } from "@/router/routes";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, type RouteObject, createHashRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { AppRouteObject } from "#/router";
import { ERROR_ROUTE } from "./routes/error-routes";

const PUBLIC_ROUTE: AppRouteObject = {
  path: "/login",
  element: (
    <ErrorBoundary FallbackComponent={PageError}>
      <Login />
    </ErrorBoundary>
  ),
};

const NO_MATCHED_ROUTE: AppRouteObject = {
  path: "*",
  element: <Navigate to="/404" replace />,
};

export default function Router() {
  const MAIN_ROUTE: AppRouteObject = {
    path: "/",
    element: <DashboardLayout routes={routes} />,
    children: [
      { index: true, element: <Navigate to="/strategyStructures" replace /> },
      ...routes,
    ],
  };

  const routeConfig = [
    PUBLIC_ROUTE,
    MAIN_ROUTE,
    NO_MATCHED_ROUTE,
    ERROR_ROUTE,
  ] as RouteObject[];

  const router = createHashRouter(routeConfig);

  return <RouterProvider router={router} />;
}
