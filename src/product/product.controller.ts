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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ClassSerializerInterceptor,
  HttpException,
  Query,
  Put,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/guard/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonResponseInterceptor } from 'src/interceptor/common-response.interceptor';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductRequestDto } from './dto/request/product-request.dto';
import { ProductParamsDto } from './dto/request/product-params.dto';
import { Roles } from 'src/decorator/roles.decorator';
import { UserRole } from 'src/user/enums/user.role';

@ApiTags('product')
@Controller('product')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
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
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpg|jpeg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() request: ProductRequestDto,
  ) {
    try {
      return await this.productService.create(request, file);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by product name',
  })
  @ApiQuery({
    name: 'categoryName',
    required: false,
    description: 'Filter by category name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    example: 'name',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    description: 'Sort direction',
    enum: ['ASC', 'DESC', 'asc', 'desc'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
  })
  async findAll(@Query() params: ProductParamsDto) {
    try {
      return await this.productService.findAll(params);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve products',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to update product',
  })
  async update(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpg|jpeg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Param('id') id: string,
    @Body() request: ProductRequestDto,
  ) {
    try {
      return await this.productService.update(id, request, file);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'delete product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to delete product',
  })
  async remove(@Param('id') id: string) {
    try {
      return await this.productService.remove(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
