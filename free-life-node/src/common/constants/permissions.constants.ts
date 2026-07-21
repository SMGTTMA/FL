/**
 * 系统权限常量定义
 */
export const PERMISSIONS = {
  // 用户权限
  USER: {
    SUPER_ADMIN: 'user:isSuperAdmin',  // 超级管理员权限
  },
} as const;

// 导出类型
export type PermissionType = typeof PERMISSIONS;