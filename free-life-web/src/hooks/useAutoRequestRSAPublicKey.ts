import {
  useEncryptionRSAPublicKey,
  useFetchRSAPublicKey,
} from "@/store/encryptionStore";
import { useEffect } from "react";

export const useAutoRequestRSAPublicKey = () => {
  const RSAPublicKey = useEncryptionRSAPublicKey();
  const { fetch: fetchRSAPublicKey } = useFetchRSAPublicKey();

  useEffect(() => {
    if (!RSAPublicKey) {
      fetchRSAPublicKey();
    }
  }, [RSAPublicKey, fetchRSAPublicKey]);
};
