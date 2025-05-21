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
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/guard/jwt.guard';
import { CartRequestDto } from './dto/request/cart-request.dto';
import { CurrentUser } from 'src/decorator/current-user.decorator';
import { PagingResponse } from 'src/api/response/paging.response';
import { CartResponseDto } from './dto/response/cart-response.dto';
import { JwtClaims } from 'src/guard/jwt.claims';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() request: CartRequestDto,
    @CurrentUser() user: JwtClaims,
  ): Promise<CartResponseDto> {
    try {
      return await this.cartService.create(request, user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create cart item',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: JwtClaims,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<{ data: CartResponseDto[]; paging: PagingResponse }> {
    try {
      if (page < 1) page = 1;
      if (size < 1) size = 10;
      return await this.cartService.findAll(user, page, size);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve cart items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<CartResponseDto> {
    try {
      return await this.cartService.findOne(id, user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to retrieve cart item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Query('qty', ParseIntPipe) quantity: number,
    @CurrentUser() user: any,
  ): Promise<CartResponseDto> {
    try {
      if (quantity === undefined || quantity === null) {
        throw new HttpException(
          'Quantity (qty) query parameter is required.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.cartService.update(id, quantity, user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to update cart item',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    try {
      const resultMessage = await this.cartService.remove(id, user);
      return { message: resultMessage };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to delete cart item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
