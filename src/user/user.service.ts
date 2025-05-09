import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  LoginRequestDto,
  RegisterRequestDto,
  UserRequest,
} from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  LoginResponseDto,
  RefreshTokenResponseDto,
  RegisterResponseDto,
  UserResponse,
} from './dto/response/user-response.dto';
import { UserRole } from './enums/user.role';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { formatDateFromInput } from 'src/utils/DateUtil';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async createUser(request: RegisterRequestDto): Promise<RegisterResponseDto> {
    const existingEmail = await this.userRepository.findOne({
      where: { email: request.email },
    });
    if (existingEmail) throw new ConflictException('Email already taken');
    try {
      const user = UserRequest.toUserEntity(request);
      user.role = UserRole.CUSTOMER;
      const createdUser = await this.userRepository.save(user);
      return UserResponse.toRegisterResponse(createdUser);
    } catch (error) {
      throw new ConflictException('Failed to create user');
    }
  }
  async createAdmin(request: RegisterRequestDto): Promise<RegisterResponseDto> {
    const existingEmail = await this.userRepository.findOne({
      where: { email: request.email },
    });
    if (existingEmail) throw new ConflictException('Email already taken');
    try {
      const user = UserRequest.toUserEntity(request);
      user.role = UserRole.ADMIN;
      const createdUser = await this.userRepository.save(user);
      return UserResponse.toRegisterResponse(createdUser);
    } catch (error) {
      throw new ConflictException('Failed to create user');
    }
  }

  async login(request: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username: request.username },
    });
    if (!user) throw new ConflictException('Invalid email or password');
    const isValidPassword = await user.comparePassword(request.password);
    if (!isValidPassword)
      throw new ConflictException('Invalid email or password');
    const payload = { sub: user.username, id: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    const loginResponsePayload = {
      accessToken: token,
      role: payload.role,
    };
    return UserResponse.toLoginResponse(loginResponsePayload);
  }

  async validateUser(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new ConflictException('Invalid username');
  }

  async logout(token: string) {
    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      throw new ConflictException('Invalid token');
    }

    const expiration = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiration - now;
    if (ttl > 0) {
      await this.cacheManager.set(`blacklist_${token}`, 'true', ttl * 1000);
    }
    return { message: 'Logout success' };
  }

  async refreshToken(user: any): Promise<RefreshTokenResponseDto> {
    try {
      const payload = { sub: user.username, id: user.id, role: user.role };
      const date = formatDateFromInput(new Date());
      const token = this.jwtService.sign(payload);
      return {
        accessToken: token,
        role: payload.role,
        dateTimeRefreshed: date,
      };
    } catch (error) {
      throw new ConflictException('invalid token');
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    try {
    } catch (error) {}
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
