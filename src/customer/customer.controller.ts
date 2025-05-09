import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Put,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from 'src/guard/jwt.guard';
import { CustomerRequestDto } from './dto/request/customer-request.dto';
import { CurrentUser } from 'src/decorator/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonResponse } from 'src/api/response/common.response';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommonResponseInterceptor } from 'src/interceptor/common-response.interceptor';
import { Roles } from 'src/decorator/roles.decorator';
import { UserRole } from 'src/user/enums/user.role';

// @ApiTags('customer')
@Controller('customer')
//@UseInterceptors(ClassSerializerInterceptor, CommonResponseInterceptor)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new customer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer created successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
  async create(@Body() request: CustomerRequestDto, @CurrentUser() user: any) {
    try {
      return await this.customerService.create(request, user);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('/profile-picture')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update customer profile picture' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Profile picture updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to upload profile picture',
  })
  async uploadProfilePicture(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpg|jpeg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    try {
      return await this.customerService.updateProfilPicture(user.id, file);
    } catch (error) {
      throw new Error(`failed to upload profile picture: ${error.message}`);
    }
  }

  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve customer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieve customer successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve customer',
  })
  async customerProfile(@CurrentUser() user: any) {
    try {
      return await this.customerService.customerProfile(user);
    } catch (error) {
      throw new HttpException(
        'error retrieve customer profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  findAll() {
    return this.customerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerService.remove(+id);
  }
}
