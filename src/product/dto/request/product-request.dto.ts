import {
  ArrayNotEmpty,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  isPositive,
  Matches,
  Min,
} from 'class-validator';
import { ProductDetail } from 'src/product/entities/product.detail.entity';
import { Product } from 'src/product/entities/product.entity';

export class ProductRequestDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  categoryId: string;

  @ArrayNotEmpty({ message: 'Array is required' })
  productDetail: ProductDetailRequestDto[];
}

export class ProductDetailRequestDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNotEmpty({ message: 'expired date is required' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expiredAt harus dalam format yyyy-MM-dd',
  })
  expiredat: Date;
}

export class ProductDetailRequest {
  static toProductDetailEntity(
    request: ProductDetailRequestDto,
  ): ProductDetail {
    const productDetail = new ProductDetail();
    productDetail.price = request.price;
    productDetail.stock = request.stock;
    productDetail.expiredAt = request.expiredat;
    return productDetail;
  }
}

export class ProductRequest {
  static toProductEntity(request: ProductRequestDto): Product {
    const product = new Product();
    product.name = request.name;
    product.description = request.description;
    product.category.id = request.categoryId;
    product.productDetail = request.productDetail.map((detailDto) =>
      ProductDetailRequest.toProductDetailEntity(detailDto),
    );
    return product;
  }
}
