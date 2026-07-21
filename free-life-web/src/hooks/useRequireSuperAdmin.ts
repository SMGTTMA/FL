import { useUserInfo } from "@/store/userStore";

const { VITE_SUPER_ADMIN_ID } = import.meta.env;

export const useRequireSuperAdmin = () => {
  const { id } = useUserInfo();
  if (String(VITE_SUPER_ADMIN_ID).split(",").includes(String(id))) {
    return false;
  }
  return true;
};
