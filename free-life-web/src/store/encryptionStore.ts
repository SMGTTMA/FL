import { useRequest } from "ahooks";
import { create } from "zustand";
import { createJSONStorage, persist, devtools } from "zustand/middleware";

import { EncryptionEnum } from "#/enum";
import { getRSAPublicKey } from "@/api/services/cryptoService";

type EncryptionStore = {
  RSAPublicKey: string;
  actions: {
    setRSAPublicKey: (RSAPublicKey: string) => void;
  };
};

export const useEncryptionStore = create<EncryptionStore>()(
  devtools(
    persist(
      (set) => ({
        RSAPublicKey: "",
        actions: {
          setRSAPublicKey: (RSAPublicKey) => {
            set({ RSAPublicKey });
          },
        },
      }),
      {
        name: "encryptionStore",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          [EncryptionEnum.RSAPublicKey]: state.RSAPublicKey,
        }),
      }
    )
  )
);

export const useEncryptionRSAPublicKey = () =>
  useEncryptionStore((state) => state.RSAPublicKey);
export const useEncryptionActions = () =>
  useEncryptionStore((state) => state.actions);

export const useFetchRSAPublicKey = () => {
  const { setRSAPublicKey } = useEncryptionActions();

  const { run: fetch, loading: isLoading } = useRequest(getRSAPublicKey, {
    manual: true,
    onSuccess: (data) => {
      setRSAPublicKey(data);
    },
  });

  return { fetch, isLoading };
};
