export interface UserItem {
  id: number | string;
  username: string;
  isActive: boolean | number;
  loginFailedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserListData {
  list: UserItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FindAllUsersReq {
  page?: number;
  pageSize?: number;
  username?: string;
  isActive?: 0 | 1;
}

export interface FindOneUserReq {
  id: number;
}

export interface UpdateUserDataReq {
  username?: string;
  password?: string;
  isActive?: 0 | 1;
  loginFailedCount?: number;
}

export interface UpdateUserReq {
  id: number;
  data: UpdateUserDataReq;
}

export interface DeleteUserReq {
  id: number;
}
