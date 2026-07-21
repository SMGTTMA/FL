import { useEncryptionRSAPublicKey } from "@/store/encryptionStore";

/**
 * 将 PEM 格式公钥转为 ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

/**
 * 使用 WebCrypto API 进行 RSA-OAEP (SHA-256) 加密
 */
async function encryptOAEP(
  publicKeyPem: string,
  data: string
): Promise<string> {
  const keyBuffer = pemToArrayBuffer(publicKeyPem);
  const cryptoKey = await window.crypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    cryptoKey,
    new TextEncoder().encode(data)
  );
  // 返回 base64 字符串
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export const useRSAEncrypt = () => {
  const RSAPublicKey = useEncryptionRSAPublicKey();
  const encrypt = async (password: string): Promise<string> => {
    if (RSAPublicKey) {
      return await encryptOAEP(RSAPublicKey, password);
    }
    return password;
  };
  return { encrypt };
};
