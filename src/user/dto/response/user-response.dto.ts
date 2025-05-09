import { User } from 'src/user/entities/user.entity';

export class RegisterResponseDto {
  name: string = '';
  email: string = '';
  role: string = '';
}

export class LoginResponseDto {
  accessToken: string;
  role: string;
}

export class LogoutResponseDto {
  success: boolean;
  message: string;
}

export class TokenResponse {
  accessToken: string;
  role: string;
}

export class UserResponseDto {
  id: string;
  fullname: string;
  username: string;
  email: string;
}

export class RefreshTokenResponseDto {
  accessToken: string;
  role: string;
  dateTimeRefreshed: string;
}

export class UserResponse {
  static toRegisterResponse(user: User): RegisterResponseDto {
    return {
      name: user.fullName,
      email: user.email,
      role: user.role,
    };
  }

  static toLoginResponse(payload: TokenResponse): LoginResponseDto {
    return {
      accessToken: payload.accessToken,
      role: payload.role,
    };
  }

  static toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullname: user.fullName,
      username: user.username,
      email: user.email,
    };
  }
}
