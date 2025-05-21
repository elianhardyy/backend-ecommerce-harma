import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { Repository } from 'typeorm';
import {
  CartRequestDto,
  CartRequestMapper,
} from './dto/request/cart-request.dto';
import {
  CartResponseDto,
  CartResponseMapper,
} from './dto/response/cart-response.dto';
import { PagingResponse } from 'src/api/response/paging.response';
import { JwtClaims } from 'src/guard/jwt.claims';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}

  async create(
    request: CartRequestDto,
    user: JwtClaims,
  ): Promise<CartResponseDto> {
    try {
      const existingCartItem = await this.cartRepository.findOne({
        where: {
          user: { id: user.id },
          product: { id: request.productId },
        },
      });

      if (existingCartItem) {
        existingCartItem.quantity += request.quantity;
        if (existingCartItem.quantity < 0) existingCartItem.quantity = 0;
        const updatedCart = await this.cartRepository.save(existingCartItem);
        return CartResponseMapper.toCartResponse(updatedCart);
      } else {
        if (request.quantity < 0) request.quantity = 0;
        const cart = CartRequestMapper.dtotoEntity(request, user);
        const savedCart = await this.cartRepository.save(cart);
        return CartResponseMapper.toCartResponse(savedCart);
      }
    } catch (error) {
      throw new Error('Failed to create or update cart');
    }
  }

  async findAll(
    user: JwtClaims,
    page: number = 1,
    size: number = 10,
  ): Promise<{ data: CartResponseDto[]; paging: PagingResponse }> {
    page = Math.max(1, page);
    size = Math.max(1, size);

    const skip = (page - 1) * size;

    const cartItemsQueryBuilder = this.cartRepository
      .createQueryBuilder('cart')
      .leftJoinAndSelect('cart.product', 'product')
      .leftJoinAndSelect('cart.user', 'userEntity')
      .where('userEntity.id = :userId', { userId: user.id })
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(size);

    const distinctProductCountQueryBuilder = this.cartRepository
      .createQueryBuilder('cart')
      .leftJoin('cart.user', 'userEntityCount')
      .leftJoin('cart.product', 'productCount')
      .where('userEntityCount.id = :userId', { userId: user.id })
      .select('COUNT(DISTINCT productCount.id)', 'count');

    try {
      const [cartItems, totalCartItems] =
        await cartItemsQueryBuilder.getManyAndCount();

      const distinctProductResult =
        await distinctProductCountQueryBuilder.getRawOne();
      const totalDistinctProducts = distinctProductResult
        ? parseInt(distinctProductResult.count, 10)
        : 0;
      const paging = PagingResponse.of(page, size, totalDistinctProducts);

      return {
        data: cartItems.map((cart) => CartResponseMapper.toCartResponse(cart)),
        paging,
      };
    } catch (error) {
      throw new Error('Failed to retrieve cart');
    }
  }

  async findOne(id: string, user: any): Promise<CartResponseDto> {
    const cartItem = await this.cartRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['product', 'user'],
    });
    if (!cartItem) {
      throw new NotFoundException(
        `Cart item with ID "${id}" not found or does not belong to user.`,
      );
    }
    return CartResponseMapper.toCartResponse(cartItem);
  }

  async update(id: string, qty: number, user: any): Promise<CartResponseDto> {
    try {
      const cartItem = await this.cartRepository.findOne({
        where: { id, user: { id: user.id } },
        relations: ['product', 'user'],
      });

      if (!cartItem) {
        throw new NotFoundException(
          `Cart item with ID "${id}" not found or not owned by user.`,
        );
      }

      CartRequestMapper.updateCartQuantity(cartItem, qty);
      if (cartItem.quantity <= 0) {
        await this.cartRepository.remove(cartItem);
        throw new NotFoundException(
          `Cart item with ID "${id}" removed as quantity reached zero.`,
        );
      } else {
        const updatedCart = await this.cartRepository.save(cartItem);
        return CartResponseMapper.toCartResponse(updatedCart);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error('Update cart is failed');
    }
  }

  async remove(id: string, user: any): Promise<string> {
    try {
      const cartItem = await this.cartRepository.findOne({
        where: { id, user: { id: user.id } },
      });

      if (!cartItem) {
        throw new NotFoundException(
          `Cart item with ID "${id}" not found or not owned by user.`,
        );
      }
      await this.cartRepository.delete(id);
      return 'deleted successfully';
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error('Delete cart is failed');
    }
  }
}
