import { useRequest } from "ahooks";
import { useNavigate } from "react-router";
import { create } from "zustand";
import { createJSONStorage, persist, devtools } from "zustand/middleware";

import { signin, getUserInfo } from "@/api/services/userService";

import { toast } from "sonner";
import type { UserInfo, UserToken } from "#/entity";
import { StorageEnum } from "#/enum";

const { VITE_APP_HOMEPAGE: HOMEPAGE } = import.meta.env;

type UserStore = {
  userInfo: Partial<UserInfo>;
  userToken: UserToken;
  // 使用 actions 命名空间来存放所有的 action
  actions: {
    setUserInfo: (userInfo: UserInfo) => void;
    setUserToken: (token: UserToken) => void;
    clearUserInfoAndToken: () => void;
  };
};

const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        userInfo: {},
        userToken: {},
        actions: {
          setUserInfo: (userInfo) => {
            set({ userInfo });
          },
          setUserToken: (userToken) => {
            set({ userToken });
          },
          clearUserInfoAndToken() {
            set({ userInfo: {}, userToken: {} });
          },
        },
      }),
      {
        name: "userStore", // name of the item in the storage (must be unique)
        storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
        partialize: (state) => ({
          [StorageEnum.UserInfo]: state.userInfo,
          [StorageEnum.UserToken]: state.userToken,
        }),
      }
    )
  )
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useFetchUserInfo = () => {
  const { setUserInfo } = useUserActions();

  const { run: fetch, loading: isLoading } = useRequest(getUserInfo, {
    manual: true,
    onSuccess: (data) => {
      setUserInfo(data);
    },
    onError: (error) => {
      throw error;
    },
  });

  return { fetch, isLoading };
};

export const useSignIn = () => {
  const navigate = useNavigate();
  const { setUserToken } = useUserActions();

  const { run: signIn, loading } = useRequest(signin, {
    manual: true,
    onSuccess: (data) => {
      const { accessToken, tokenType } = data;
      setUserToken({ accessToken, tokenType });
      navigate(HOMEPAGE, { replace: true });
      toast.success("Sign in success!");
    },
  });

  return { signIn, loading };
};

export default useUserStore;
