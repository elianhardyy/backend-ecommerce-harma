import { ArrayNotEmpty, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Cart } from 'src/cart/entities/cart.entity';
import { Product } from 'src/product/entities/product.entity';
import { User } from 'src/user/entities/user.entity';

export class CartRequestDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  productId: string;
}

export class CartRequestMapper {
  static dtotoEntity(request: CartRequestDto, user: any): Cart {
    const cart = new Cart();
    cart.quantity = request.quantity;
    if (request.productId) {
      cart.product = { id: request.productId } as Product;
    }
    if (user) {
      cart.user = { id: user.id } as User;
    }
    return cart;
  }

  static updateCartQuantity(cart: Cart, quantity: number): number {
    cart.quantity = quantity;
    return cart.quantity;
  }
}
