import { DelOkxApiConfig } from "../delOkxApiConfig/DelOkxApiConfig";

export const renderColumns = (args: { refresh: () => void }) => {
  const { refresh } = args;

  return [
    {
      title: "配置名称",
      dataIndex: "configName",
    },
    {
      title: "交易所名称",
      dataIndex: "exchangeName",
    },
    {
      title: "是否为测试网",
      dataIndex: "isTestNet",
      render: (isTestNet: boolean) => (isTestNet ? "是" : "否"),
    },
    {
      title: "是否激活",
      dataIndex: "isActive",
      render: (isActive: boolean) => (isActive ? "激活" : "停用"),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: { id: number }) => (
        <DelOkxApiConfig id={record.id} refresh={refresh} />
      ),
    },
  ];
};
