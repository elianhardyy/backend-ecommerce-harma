import { CategoryResponseDto } from 'src/category/dto/response/category-response.dto';
import { ProductDetail } from 'src/product/entities/product.detail.entity';
import { Product } from 'src/product/entities/product.entity';
import { CategoryResponse } from 'src/category/dto/response/category-response.dto';

export class ProductResponseDto {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: CategoryResponseDto;
  subcategory?: CategoryResponseDto | null;
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
    productResponse.imageUrl = product.imageUrl;

    if (product.productDetail) {
      productResponse.productDetail = product.productDetail.map((detail) =>
        ProductDetailResponse.toProductDetailResponse(detail),
      );
    } else {
      productResponse.productDetail = [];
    }

    if (product.category) {
      productResponse.category = CategoryResponse.toCategoryResponse(
        product.category,
      );
    }

    if (product.subcategory) {
      productResponse.subcategory = CategoryResponse.toCategoryResponse(
        product.subcategory,
      );
    } else {
      productResponse.subcategory = null;
    }

    return productResponse;
  }
}
