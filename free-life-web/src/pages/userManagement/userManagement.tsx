import { useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import {
  deleteUser,
  findAllUsers,
  findOneUser,
  updateUser,
} from "@/api/services/userService";
import type {
  UpdateUserDataReq,
  UserItem,
} from "@/api/types/userManagementTypes";
import { RegisterUser } from "./components/registerUser/RegisterUser";

const PAGE_SIZE = 20;

type QueryFormValues = {
  username?: string;
  isActive?: 0 | 1;
};

type EditFormValues = {
  username: string;
  password?: string;
  isActive: 0 | 1;
  loginFailedCount: number;
};

const formatDateTime = (value?: string) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";

const normalizeIsActiveValue = (isActive: UserItem["isActive"]) =>
  isActive === true || isActive === 1 ? 1 : 0;

const normalizeUserId = (id: number | string) => {
  const parsedId = Number(id);
  if (Number.isNaN(parsedId)) {
    throw new Error("用户 ID 格式错误");
  }
  return parsedId;
};

const UserManagement = () => {
  const { message } = App.useApp();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [queryParams, setQueryParams] = useState<{
    username?: string;
    isActive?: 0 | 1;
  }>({});

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserItem>();
  const [deleteLoadingId, setDeleteLoadingId] = useState<number>();

  const {
    data: userListData,
    loading: userListLoading,
    refresh: refreshUserList,
  } = useRequest(
    () =>
      findAllUsers({
        page,
        pageSize,
        username: queryParams.username,
        isActive: queryParams.isActive,
      }),
    {
      refreshDeps: [page, pageSize, queryParams],
    },
  );

  const handleSearch = async () => {
    const values = await queryForm.validateFields();
    setPage(1);
    setQueryParams({
      username: values.username?.trim() || undefined,
      isActive: values.isActive,
    });
  };

  const handleReset = () => {
    queryForm.resetFields();
    setPage(1);
    setPageSize(PAGE_SIZE);
    setQueryParams({});
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current || 1);
    setPageSize(pagination.pageSize || PAGE_SIZE);
  };

  const handleViewUserDetail = async (record: UserItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setCurrentUser(undefined);
    try {
      const id = normalizeUserId(record.id);
      const user = await findOneUser({ id });
      setCurrentUser(user);
    } catch (error) {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = async (record: UserItem) => {
    setEditOpen(true);
    setEditLoading(true);
    try {
      const id = normalizeUserId(record.id);
      const user = await findOneUser({ id });
      setCurrentUser(user);
      editForm.setFieldsValue({
        username: user.username,
        isActive: normalizeIsActiveValue(user.isActive),
        loginFailedCount: user.loginFailedCount,
      });
    } catch (error) {
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setCurrentUser(undefined);
    editForm.resetFields();
  };

  const handleUpdateUser = async () => {
    if (!currentUser) return;
    const values = await editForm.validateFields();
    const payload: UpdateUserDataReq = {
      username: values.username?.trim(),
      isActive: values.isActive,
      loginFailedCount: Number(values.loginFailedCount),
    };

    if (values.password) {
      payload.password = values.password;
    }

    setEditLoading(true);
    try {
      await updateUser({
        id: normalizeUserId(currentUser.id),
        data: payload,
      });
      message.success("更新成功");
      handleCloseEdit();
      refreshUserList();
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (record: UserItem) => {
    const id = normalizeUserId(record.id);
    setDeleteLoadingId(id);
    try {
      await deleteUser({ id });
      message.success("删除成功");
      if ((userListData?.list.length || 0) === 1 && page > 1) {
        setPage(page - 1);
      } else {
        refreshUserList();
      }
    } finally {
      setDeleteLoadingId(undefined);
    }
  };

  const columns: ColumnsType<UserItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left",
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      width: 140,
      ellipsis: true,
    },
    {
      title: "启用状态",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (isActive: UserItem["isActive"]) =>
        normalizeIsActiveValue(isActive) === 1 ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        ),
    },
    {
      title: "登录失败次数",
      dataIndex: "loginFailedCount",
      key: "loginFailedCount",
      width: 130,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      fixed: "right",
      width: 190,
      render: (_, record) => {
        const isDeleting =
          deleteLoadingId !== undefined &&
          String(deleteLoadingId) === String(record.id);

        return (
          <Space>
            <Button type="link" onClick={() => handleViewUserDetail(record)}>
              详情
            </Button>
            <Button type="link" onClick={() => handleOpenEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title="确定删除该用户吗？"
              description="删除后不可恢复，请谨慎操作。"
              okText="确定"
              cancelText="取消"
              onConfirm={() => handleDeleteUser(record)}
            >
              <Button type="link" danger loading={isDeleting}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="p-2">
      <Card
        title="用户列表"
        extra={
          <Space>
            <Button type="primary" onClick={() => setRegisterOpen(true)}>
              注册用户
            </Button>
            <Button onClick={refreshUserList} loading={userListLoading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Form
          form={queryForm}
          layout="inline"
          className="!mb-6"
          onFinish={handleSearch}
        >
          <Form.Item label="用户名" name="username">
            <Input allowClear placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="启用状态" name="isActive">
            <Select
              allowClear
              placeholder="请选择启用状态"
              style={{ width: 160 }}
              options={[
                { label: "启用", value: 1 },
                { label: "禁用", value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={userListData?.list || []}
          loading={userListLoading}
          pagination={{
            current: page,
            pageSize,
            total: userListData?.total || 0,
            showSizeChanger: true,
            showQuickJumper: false,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: 980, y: "calc(100vh - 360px)" }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="注册用户"
        open={registerOpen}
        footer={null}
        destroyOnClose
        onCancel={() => setRegisterOpen(false)}
      >
        <RegisterUser
          useCard={false}
          onSuccess={() => {
            setRegisterOpen(false);
            refreshUserList();
          }}
        />
      </Modal>

      <Modal
        title="用户详情"
        open={detailOpen}
        footer={null}
        onCancel={() => setDetailOpen(false)}
      >
        <Spin spinning={detailLoading}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">
              {currentUser?.id || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              {currentUser?.username || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="启用状态">
              {normalizeIsActiveValue(currentUser?.isActive || 0) === 1
                ? "启用"
                : "禁用"}
            </Descriptions.Item>
            <Descriptions.Item label="登录失败次数">
              {currentUser?.loginFailedCount ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(currentUser?.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {formatDateTime(currentUser?.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Modal>

      <Modal
        title="编辑用户"
        open={editOpen}
        maskClosable={false}
        confirmLoading={editLoading}
        onOk={handleUpdateUser}
        onCancel={handleCloseEdit}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 1, max: 50, message: "用户名长度为 1-50 位" },
            ]}
            normalize={(value) => value?.trim()}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  if (value.length < 6) {
                    return Promise.reject(new Error("密码至少 6 位"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password placeholder="不修改请留空" />
          </Form.Item>
          <Form.Item
            label="启用状态"
            name="isActive"
            rules={[{ required: true, message: "请选择启用状态" }]}
          >
            <Select
              placeholder="请选择启用状态"
              options={[
                { label: "启用", value: 1 },
                { label: "禁用", value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="登录失败次数"
            name="loginFailedCount"
            rules={[
              { required: true, message: "请输入登录失败次数" },
              { type: "number", min: 0, message: "登录失败次数不能小于 0" },
              {
                validator: (_, value: number | null | undefined) => {
                  if (value === null || value === undefined) {
                    return Promise.resolve();
                  }
                  if (!Number.isInteger(value)) {
                    return Promise.reject(new Error("登录失败次数必须为整数"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="请输入登录失败次数"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
