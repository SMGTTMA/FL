import { Iconify } from "@/components/icon";
import { Dropdown, type MenuProps } from "antd";
import { MultiTabOperation } from "#/enum";
import { useTabLabelRender } from "../hooks/use-tab-label-render";
import { useMultiTabsContext } from "../providers/multi-tabs-provider";
import type { TabItemProps } from "../types";

/** 标签页操作菜单标签映射 */
const TAB_OPERATION_LABELS: Record<string, string> = {
	[MultiTabOperation.REFRESH]: "刷新",
	[MultiTabOperation.CLOSE]: "关闭标签页",
	[MultiTabOperation.CLOSELEFT]: "关闭左侧标签页",
	[MultiTabOperation.CLOSERIGHT]: "关闭右侧标签页",
	[MultiTabOperation.CLOSEOTHERS]: "关闭其它标签页",
	[MultiTabOperation.CLOSEALL]: "关闭所有标签页",
};

export function TabItem({ tab, style, onClose }: TabItemProps) {
	const { tabs, refreshTab, closeTab, closeOthersTab, closeLeft, closeRight, closeAll } = useMultiTabsContext();

	const renderTabLabel = useTabLabelRender();
	const menuItems: MenuProps["items"] = [
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.REFRESH],
			key: MultiTabOperation.REFRESH,
			icon: <Iconify icon="mdi:reload" size={18} />,
		},
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.CLOSE],
			key: MultiTabOperation.CLOSE,
			icon: <Iconify icon="material-symbols:close" size={18} />,
			disabled: tabs.length === 1,
		},
		{
			type: "divider",
		},
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.CLOSELEFT],
			key: MultiTabOperation.CLOSELEFT,
			icon: <Iconify icon="material-symbols:tab-close-right-outline" size={18} className="rotate-180" />,
			disabled: tabs.findIndex((t) => t.key === tab.key) === 0,
		},
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.CLOSERIGHT],
			key: MultiTabOperation.CLOSERIGHT,
			icon: <Iconify icon="material-symbols:tab-close-right-outline" size={18} />,
			disabled: tabs.findIndex((t) => t.key === tab.key) === tabs.length - 1,
		},
		{
			type: "divider",
		},
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.CLOSEOTHERS],
			key: MultiTabOperation.CLOSEOTHERS,
			icon: <Iconify icon="material-symbols:tab-close-outline" size={18} />,
			disabled: tabs.length === 1,
		},
		{
			label: TAB_OPERATION_LABELS[MultiTabOperation.CLOSEALL],
			key: MultiTabOperation.CLOSEALL,
			icon: <Iconify icon="mdi:collapse-all-outline" size={18} />,
		},
	];

	const menuClick = (menuInfo: any) => {
		const { key, domEvent } = menuInfo;
		domEvent.stopPropagation();

		switch (key) {
			case MultiTabOperation.REFRESH:
				refreshTab(tab.key);
				break;
			case MultiTabOperation.CLOSE:
				closeTab(tab.key);
				break;
			case MultiTabOperation.CLOSEOTHERS:
				closeOthersTab(tab.key);
				break;
			case MultiTabOperation.CLOSELEFT:
				closeLeft(tab.key);
				break;
			case MultiTabOperation.CLOSERIGHT:
				closeRight(tab.key);
				break;
			case MultiTabOperation.CLOSEALL:
				closeAll();
				break;
			default:
				break;
		}
	};

	return (
		<Dropdown
			trigger={["contextMenu"]}
			menu={{
				items: menuItems,
				onClick: menuClick,
			}}
		>
			<div className="relative flex select-none items-center px-4 py-1" style={style}>
				<div>{renderTabLabel(tab)}</div>
				{!tab.hideTab && (
					<Iconify
						icon="ion:close-outline"
						size={18}
						className="ml-2 cursor-pointer opacity-50"
						onClick={(e) => {
							e.stopPropagation();
							onClose?.();
						}}
					/>
				)}
			</div>
		</Dropdown>
	);
}
