import { Cart } from 'src/cart/entities/cart.entity';
import {
  ProductResponse,
  ProductResponseDto,
} from 'src/product/dto/response/product-response.dto';
import {
  UserResponse,
  UserResponseDto,
} from 'src/user/dto/response/user-response.dto';

export class CartResponseDto {
  id: string;
  quantity: number;
  user: UserResponseDto;
  product: ProductResponseDto;
}

export class CartResponseMapper {
  static toCartResponse(cart: Cart): CartResponseDto {
    const cartResponse = new CartResponseDto();
    cartResponse.id = cart.id;
    cartResponse.quantity = cart.quantity;
    const userResponse = UserResponse.toUserResponse(cart.user);
    cartResponse.user = userResponse;
    const productResponse = ProductResponse.toProductResponse(cart.product);
    cartResponse.product = productResponse;
    return cartResponse;
  }
}
