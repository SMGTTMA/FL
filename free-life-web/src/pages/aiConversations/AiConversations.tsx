import { useState } from "react";
import { Space, Table, Button, Modal, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { getMyAiConversations } from "@/api/services/aiConversationsService";
import type { AiConversationItem } from "@/api/types/aiConversationsTypes";
import { StrategyNameEnum } from "@/api/enums/global";

/** 每页显示数量 */
const PAGE_SIZE = 10;

const AiConversations = () => {
  const [page, setPage] = useState<number>(1);

  const {
    data,
    loading,
    run: refresh,
  } = useRequest(
    () =>
      getMyAiConversations({
        page,
        pageSize: PAGE_SIZE,
      }),
    {
      refreshDeps: [page],
    }
  );

  /** 显示完整 Prompt */
  const showPrompt = (prompt: string) => {
    Modal.info({
      title: "AI Prompt",
      width: 800,
      content: (
        <pre style={{
          maxHeight: "500px",
          overflow: "auto",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}>
          {prompt}
        </pre>
      ),
    });
  };

  /** 显示 AI 响应 */
  const showAiResponse = (aiResponse: string) => {
    Modal.info({
      title: "AI 响应",
      width: 800,
      content: (
        <pre style={{
          maxHeight: "500px",
          overflow: "auto",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}>
          {aiResponse}
        </pre>
      ),
    });
  };

  /** 显示决策详情 */
  const showDecision = (decision: any) => {
    Modal.info({
      title: "AI 决策",
      width: 800,
      content: (
        <pre style={{
          maxHeight: "500px",
          overflow: "auto",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}>
          {JSON.stringify(decision, null, 2)}
        </pre>
      ),
    });
  };

  /** 获取执行结果标签 */
  const getExecutionResultTag = (result: string) => {
    const tagMap: Record<string, { color: string; text: string }> = {
      success: { color: "green", text: "成功" },
      failed: { color: "red", text: "失败" },
      skipped: { color: "orange", text: "跳过" },
      no_action: { color: "default", text: "无操作" },
    };
    const config = tagMap[result] || { color: "default", text: result };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /** 表格列定义 */
  const columns: ColumnsType<AiConversationItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      fixed: "left",
    },
    {
      title: "策略类型",
      dataIndex: "strategyType",
      key: "strategyType",
      width: 150,
      render: (strategyType: string) =>
        StrategyNameEnum[strategyType as keyof typeof StrategyNameEnum] || strategyType,
    },
    {
      title: "策略ID",
      dataIndex: "strategyId",
      key: "strategyId",
      width: 100,
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 120,
    },
    {
      title: "执行结果",
      dataIndex: "executionResult",
      key: "executionResult",
      width: 100,
      render: (result: string) => result ? getExecutionResultTag(result) : "-",
    },
    {
      title: "错误信息",
      dataIndex: "errorMessage",
      key: "errorMessage",
      width: 200,
      render: (errorMessage: string) => (
        errorMessage ? (
          <span style={{ color: "red" }}>{errorMessage}</span>
        ) : (
          "-"
        )
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (text: string) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      fixed: "right",
      width: 280,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => showPrompt(record.prompt)}>
            查看 Prompt
          </Button>
          <Button type="link" onClick={() => showAiResponse(record.aiResponse)}>
            查看响应
          </Button>
          {record.decision && (
            <Button type="link" onClick={() => showDecision(record.decision)}>
              查看决策
            </Button>
          )}
        </Space>
      ),
    },
  ];

  /** 处理分页变化 */
  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  return (
    <div className="p-2">
      <Space className="mb-2">
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
        scroll={{ x: 1400, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default AiConversations;
