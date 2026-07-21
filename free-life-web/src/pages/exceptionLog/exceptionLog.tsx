import React from "react";
import { Button, Space, Table, Tooltip, message } from "antd";
import { useRequest } from "ahooks";
import { getExceptionLog } from "@/api/services/exceptionLogService";
import { CopyOutlined } from "@ant-design/icons";
import { getKlineCache } from "@/api/services/klineCacheService";
import dayjs from "dayjs";

const PAGE_SIZE = 20;

const ExceptionLog = () => {
  const [page, setPage] = React.useState(1);

  const { data, loading, refresh, run } = useRequest(
    (params = { page: 1, pageSize: PAGE_SIZE }) => getExceptionLog(params),
    {
      defaultParams: [{ page: 1, pageSize: PAGE_SIZE }],
      refreshDeps: [page],
    }
  );

  const { run: klineCacheRun } = useRequest(getKlineCache, {
    refreshDeps: [],
  });

  // 复制文本到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message.success("复制成功");
      })
      .catch(() => {
        message.error("复制失败");
      });
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "URL", dataIndex: "url", key: "url" },
    { title: "方法", dataIndex: "method", key: "method", width: 80 },
    { title: "状态码", dataIndex: "statusCode", key: "statusCode", width: 90 },
    {
      title: "信息",
      dataIndex: "message",
      key: "message",
      render: (text: string) => (
        <div className="flex items-center justify-between">
          <Tooltip title={text}>
            <span className="flex-1 truncate">{text}</span>
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(text)}
            className="ml-2"
          />
        </div>
      ),
    },
    {
      title: "堆栈",
      dataIndex: "stack",
      key: "stack",
      ellipsis: true,
      render: (text: string) => (
        <div className="flex items-center justify-between">
          <Tooltip title={text}>
            <span className="flex-1 truncate">{text}</span>
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(text)}
            className="ml-2"
          />
        </div>
      ),
    },
    { title: "用户ID", dataIndex: "userId", key: "userId", width: 80 },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (text: string) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (text: string) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "",
    },
  ];

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    run({ page: pagination.current, pageSize: PAGE_SIZE });
  };

  return (
    <div className="p-2">
      <Space className="mb-2">
        <Button onClick={klineCacheRun}>获取缓存数据</Button>
        <Button onClick={refresh}>刷新</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.list || []}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total || 0,
          showSizeChanger: false,
          showQuickJumper: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default ExceptionLog;
