import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PERMISSIONS } from '@/common/constants/permissions.constants';
import {
  QueryUserDto,
  UpdateUserRequestDto,
  UserIdDto,
} from './dto/manage-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('adminRegister')
  async adminRegister(
    @Body() registerDto: { username: string; password: string },
  ) {
    return await this.authService.adminRegister(
      registerDto.username,
      registerDto.password,
    );
  }

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @returns 注册结果
   */
  @Post('register')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async register(@Body() registerDto: { username: string; password: string }) {
    return await this.authService.register(
      registerDto.username,
      registerDto.password,
    );
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    return await this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('me')
  async getProfile(@Request() req) {
    return await this.authService.getProfile(req.user.id);
  }

  @Post('findAllUsers')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async findAllUsers(@Body() queryDto: QueryUserDto) {
    return await this.authService.findAllUsers(queryDto);
  }

  @Post('findOneUser')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async findOneUser(@Body() body: UserIdDto) {
    return await this.authService.findOneUser(body.id);
  }

  @Post('updateUser')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async updateUser(@Body() body: UpdateUserRequestDto) {
    return await this.authService.updateUser(body.id, body.data);
  }

  @Post('deleteUser')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.USER.SUPER_ADMIN)
  async deleteUser(@Body() body: UserIdDto) {
    return await this.authService.deleteUser(body.id);
  }
}
