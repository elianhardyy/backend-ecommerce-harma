import {
  CategoryResponse,
  CategoryResponseDto,
} from 'src/category/dto/response/category-response.dto';
import { ProductDetail } from 'src/product/entities/product.detail.entity';
import { Product } from 'src/product/entities/product.entity';

export class ProductResponseDto {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: CategoryResponseDto;
  productDetail: ProductDetailResponseDto[];
}

export class ProductDetailResponseDto {
  id: string;
  price: number;
  stock: number;
  expiredAt: Date;
}

export class ProductDetailResponse {
  static toProductDetailResponse(
    productDetail: ProductDetail,
  ): ProductDetailResponseDto {
    const productDetailResponse = new ProductDetailResponseDto();
    productDetailResponse.id = productDetail.id;
    productDetailResponse.price = productDetail.price;
    productDetailResponse.stock = productDetail.stock;
    productDetailResponse.expiredAt = productDetail.expiredAt;
    return productDetailResponse;
  }
}

export class ProductResponse {
  static toProductResponse(product: Product): ProductResponseDto {
    const productResponse = new ProductResponseDto();
    productResponse.id = product.id;
    productResponse.name = product.name;
    productResponse.description = product.description;
    productResponse.imageUrl = productResponse.imageUrl;
    productResponse.productDetail = product.productDetail.map((detail) =>
      ProductDetailResponse.toProductDetailResponse(detail),
    );
    const categoryResponse = CategoryResponse.toCategoryResponse(
      product.category,
    );
    productResponse.category = categoryResponse;
    return productResponse;
  }
}
