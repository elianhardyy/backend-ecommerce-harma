import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { User } from 'src/user/entities/user.entity';

export class CreateUserDto {}

export class RegisterRequestDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Username must be at least 5 characters long' })
  username: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  password: string;
}

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  @MinLength(5, { message: 'Username must be at least 5 characters long' })
  username: string;
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class UserRequest {
  static toUserEntity(request: RegisterRequestDto): User {
    const user = new User();
    user.fullName = request.fullname;
    user.username = request.username;
    user.email = request.email;
    user.password = request.password;
    return user;
  }
}
