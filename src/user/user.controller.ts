import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  HttpCode,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  LoginRequestDto,
  RegisterRequestDto,
} from './dto/request/create-user.dto';
import { JwtAuthGuard } from 'src/guard/jwt.guard';
import { CurrentUser } from 'src/decorator/current-user.decorator';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('user/register')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() register: RegisterRequestDto) {
    try {
      return await this.userService.createUser(register);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Post('admin/register')
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() register: RegisterRequestDto) {
    try {
      return await this.userService.createAdmin(register);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() login: LoginRequestDto) {
    console.log('ini login: ', login);
    try {
      return await this.userService.login(login);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Headers('authorization') auth: string) {
    const token = auth.replace('Bearer ', '');
    try {
      return await this.userService.logout(token);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async refreshToken(@CurrentUser() user: any) {
    try {
      return await this.userService.refreshToken(user);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(+id, updateUserDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
