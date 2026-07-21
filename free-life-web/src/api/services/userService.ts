import apiClient from "../apiClient";

import type { UserInfo, UserToken } from "#/entity";
import type {
  DeleteUserReq,
  FindAllUsersReq,
  FindOneUserReq,
  UpdateUserReq,
  UserItem,
  UserListData,
} from "../types/userManagementTypes";

export interface SignInReq {
  username: string;
  password: string;
}

export type SignInRes = UserToken & { user: UserInfo };

const signin = (data: SignInReq) =>
  apiClient.post<SignInRes>({ url: "/auth/login", data });

const getUserInfo = () => apiClient.post<UserInfo>({ url: "/auth/me" });

const registerUser = (data: SignInReq) =>
  apiClient.post<UserInfo>({ url: "/auth/register", data });

const findAllUsers = (data: FindAllUsersReq) =>
  apiClient.post<UserListData>({
    url: "/auth/findAllUsers",
    data,
  });

const findOneUser = (data: FindOneUserReq) =>
  apiClient.post<UserItem>({
    url: "/auth/findOneUser",
    data,
  });

const updateUser = (data: UpdateUserReq) =>
  apiClient.post<UserItem>({
    url: "/auth/updateUser",
    data,
  });

const deleteUser = (data: DeleteUserReq) =>
  apiClient.post<void>({
    url: "/auth/deleteUser",
    data,
  });

export {
  signin,
  getUserInfo,
  registerUser,
  findAllUsers,
  findOneUser,
  updateUser,
  deleteUser,
};
