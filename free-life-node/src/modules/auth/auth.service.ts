import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ResponseDto } from '@/common/dto/response.dto';
import * as bcrypt from 'bcryptjs';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { QueryUserDto, UpdateUserDto } from './dto/manage-user.dto';
import { PaginationResponseDto } from '@/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
    private configService: ConfigService,
  ) {}

  private isSuperAdminUserId(userId: number): boolean {
    const superAdminIds = this.configService.get<string>('SUPER_ADMIN_ID');
    if (!superAdminIds) {
      return false;
    }
    return superAdminIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(String(userId));
  }

  async login(
    username: string,
    password: string,
  ): Promise<
    ResponseDto<{ accessToken: string; user: Omit<User, 'password'> }>
  > {
    try {
      if (!username || !password) {
        throw new BadRequestException('用户名和密码不能为空');
      }

      // 先用RSA解密前端传来的加密密码
      const decryptedPassword = this.cryptoService.decrypt(password);

      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        throw new BadRequestException('账号或密码错误');
      }
      if (!user.isActive) {
        throw new BadRequestException('账号已被禁用，请联系管理员');
      }
      // 校验密码
      const isPasswordValid = await bcrypt.compare(decryptedPassword, user.password);
      if (!isPasswordValid) {
        user.loginFailedCount = (user.loginFailedCount || 0) + 1;
        if (user.loginFailedCount >= 10) {
          user.isActive = false;
        }
        await this.userRepository.save(user);
        throw new BadRequestException('账号或密码错误');
      }
      // 登录成功，重置失败次数
      user.loginFailedCount = 0;
      await this.userRepository.save(user);
      const { password: _, ...result } = user;
      const payload = { username: user.username, id: user.id };
      const accessToken = this.jwtService.sign(payload);
      return ResponseDto.success({
        accessToken,
        user: result,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async getProfile(
    userId: number,
  ): Promise<ResponseDto<Omit<User, 'password'>>> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }
      const { password, ...result } = user;
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async adminRegister(
    username: string,
    password: string,
  ): Promise<ResponseDto<Omit<User, 'password'>>> {
    // 单用户数据库为空时，允许注册
    const user = await this.userRepository.find();
    if (user.length > 0) {
      throw new BadRequestException('禁止操作');
    }

    // 注册
    return await this.register(username, password);
  }

  /**
   * 用户注册
   * @param username 用户名
   * @param password 密码
   * @returns 注册结果
   */
  async register(
    username: string,
    password: string,
  ): Promise<ResponseDto<Omit<User, 'password'>>> {
    try {
      const trimUsername = username.trim();
      const trimPassword = password.trim();

      if (!trimUsername || !trimPassword) {
        throw new BadRequestException('用户名和密码不能为空');
      }

      if (trimUsername.length < 1 || trimUsername.length > 50) {
        throw new BadRequestException('用户名长度必须在1-50个字符之间');
      }

      if (trimPassword.length < 6) {
        throw new BadRequestException('密码长度不能少于6个字符');
      }

      const existingUser = await this.userRepository.findOne({
        where: { username: trimUsername },
      });

      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }

      // 对密码进行hash加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(trimPassword, salt);

      // 创建新用户
      const user = this.userRepository.create({
        username: trimUsername,
        password: hashedPassword,
        isActive: true,
      });

      // 保存用户信息
      await this.userRepository.save(user);

      // 返回用户信息（不包含密码）
      const { password: _, ...result } = user;
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findAllUsers(
    queryDto: QueryUserDto,
  ): Promise<ResponseDto<PaginationResponseDto<Omit<User, 'password'>>>> {
    const where: FindOptionsWhere<User> = {};

    if (queryDto.username?.trim()) {
      where.username = Like(`%${queryDto.username.trim()}%`);
    }

    if (queryDto.isActive !== undefined) {
      where.isActive = Boolean(queryDto.isActive);
    }

    const [list, total] = await this.userRepository.findAndCount({
      where,
      skip: (queryDto.page - 1) * queryDto.pageSize,
      take: queryDto.pageSize,
      order: { id: 'DESC' },
    });

    const safeList = list.map((user) => {
      const { password, ...result } = user;
      return result;
    });

    return ResponseDto.success(
      new PaginationResponseDto({
        list: safeList,
        total,
        page: queryDto.page,
        pageSize: queryDto.pageSize,
      }),
    );
  }

  async findOneUser(id: number): Promise<ResponseDto<Omit<User, 'password'>>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password, ...result } = user;
    return ResponseDto.success(result);
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<ResponseDto<Omit<User, 'password'>>> {
    if (this.isSuperAdminUserId(id)) {
      throw new BadRequestException('超级管理员不允许编辑');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updateData: Partial<User> = {};

    if (dto.username !== undefined) {
      const trimUsername = dto.username.trim();
      if (!trimUsername) {
        throw new BadRequestException('用户名不能为空');
      }
      if (trimUsername.length < 1 || trimUsername.length > 50) {
        throw new BadRequestException('用户名长度必须在1-50个字符之间');
      }
      const existingUser = await this.userRepository.findOne({
        where: { username: trimUsername },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('用户名已存在');
      }
      updateData.username = trimUsername;
    }

    if (dto.password !== undefined) {
      const trimPassword = dto.password.trim();
      if (!trimPassword) {
        throw new BadRequestException('密码不能为空');
      }
      if (trimPassword.length < 6) {
        throw new BadRequestException('密码长度不能少于6个字符');
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(trimPassword, salt);
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = Boolean(dto.isActive);
    }

    if (dto.loginFailedCount !== undefined) {
      updateData.loginFailedCount = dto.loginFailedCount;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('没有可更新字段');
    }

    await this.userRepository.update(id, updateData);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    const { password, ...result } = updatedUser;
    return ResponseDto.success(result);
  }

  async deleteUser(id: number): Promise<ResponseDto<{ id: number }>> {
    if (this.isSuperAdminUserId(id)) {
      throw new BadRequestException('超级管理员不允许删除');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.delete(id);
    return ResponseDto.success({ id });
  }
}
