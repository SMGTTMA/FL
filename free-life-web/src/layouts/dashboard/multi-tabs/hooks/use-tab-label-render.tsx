import { useMemo } from "react";
import type { KeepAliveTab } from "../types";

export function useTabLabelRender() {
  const specialTabRenderMap = useMemo<
    Record<string, (tab: KeepAliveTab) => React.ReactNode>
  >(
    () => ({
      "sys.menu.system.user_detail": (tab: KeepAliveTab) => {
        return tab.label;
      },
    }),
    []
  );

  const renderTabLabel = (tab: KeepAliveTab) => {
    const specialRender = specialTabRenderMap[tab.label];
    if (specialRender) {
      return specialRender(tab);
    }
    return tab.label;
  };

  return renderTabLabel;
}
