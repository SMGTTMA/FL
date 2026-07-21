import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { ConfigService } from '@nestjs/config';
import { PERMISSIONS } from '../constants/permissions.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) {
      return true; // 未声明权限，直接放行
    }
    const { user } = context.switchToHttp().getRequest();
    // 假设 user.id 是用户ID，user.permissions 是权限数组
    if (!user || !user.id) {
      throw new ForbiddenException('用户不存在');
    }

    // 判断是否是超级管理员
    if (requiredPermissions.includes(PERMISSIONS.USER.SUPER_ADMIN)) {
      const SUPER_ADMIN_ID = this.configService.get<string>('SUPER_ADMIN_ID');
      if (
        SUPER_ADMIN_ID &&
        SUPER_ADMIN_ID.split(',').includes(String(user.id))
      ) {
        return true; // 超级管理员直接放行
      }
      throw new ForbiddenException('无权限操作');
    }

    // 暂时没有以下场景
    // if (!user.permissions) {
    //   throw new ForbiddenException('无权限操作');
    // }
    // const hasPermission = requiredPermissions.every((permission) =>
    //   user.permissions.includes(permission),
    // );
    // if (!hasPermission) {
    //   throw new ForbiddenException('无权限操作');
    // }
    return true;
  }
}
