import apiClient from "../apiClient";

const getRSAPublicKey = () =>
  apiClient.post<string>({ url: "/crypto/public-key" });

export { getRSAPublicKey };
