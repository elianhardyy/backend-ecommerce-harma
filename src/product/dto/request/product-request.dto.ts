import {
  ArrayNotEmpty,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  Matches,
  Min,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ProductDetail } from 'src/product/entities/product.detail.entity';
import { Product } from 'src/product/entities/product.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tags } from 'src/product/entities/tags.entity';

export class ProductRequestDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;

  @IsNotEmpty({ message: 'categoryId is required' })
  @IsUUID('4', { message: 'Invalid UUID format for categoryId' })
  categoryId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid UUID format for subcategoryId' })
  subcategoryId?: string | null;

  @ArrayNotEmpty({ message: 'Product details array cannot be empty' })
  productDetail: ProductDetailRequestDto[];

  @ArrayNotEmpty({ message: 'Tags array cannot be empty' })
  tags: TagsRequestDto[];
}

export class ProductDetailRequestDto {
  @IsOptional()
  @IsUUID('4', { message: 'Invalid UUID format for productDetail.id' })
  id?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNotEmpty({ message: 'Expired date is required' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expiredAt must be in yyyy-MM-dd format (e.g., 2023-12-31)',
  })
  expiredAt: Date;
}

export class TagsRequestDto {
  @IsNotEmpty()
  name: string;
}

export class TagsRequestMapper {
  static dtoToEntity(request: TagsRequestDto): Tags {
    const tags = new Tags();
    tags.name = request.name;
    return tags;
  }

  static updateEntityFromDto(entity: Tags, request: TagsRequestDto): Tags {
    entity.name = request.name ?? entity.name;
    return entity;
  }
}

export class ProductDetailRequestMapper {
  static dtoToEntity(request: ProductDetailRequestDto): ProductDetail {
    const productDetail = new ProductDetail();
    if (request.id) {
      productDetail.id = request.id;
    }
    productDetail.price = request.price;
    productDetail.stock = request.stock;
    productDetail.expiredAt = new Date(request.expiredAt);
    return productDetail;
  }

  static updateEntityFromDto(
    entity: ProductDetail,
    request: ProductDetailRequestDto,
  ): ProductDetail {
    entity.price = request.price ?? entity.price;
    entity.stock = request.stock ?? entity.stock;
    entity.expiredAt = request.expiredAt
      ? new Date(request.expiredAt)
      : entity.expiredAt;
    return entity;
  }
}

export class ProductRequestMapper {
  static dtoToEntity(request: ProductRequestDto): Product {
    const product = new Product();
    product.name = request.name;
    product.description = request.description;

    if (request.categoryId) {
      product.category = { id: request.categoryId } as Category;
    }

    if (request.subcategoryId) {
      product.subcategory = { id: request.subcategoryId } as Category;
    } else {
      product.subcategory = null;
    }

    product.productDetail = request.productDetail.map((detailDto) =>
      ProductDetailRequestMapper.dtoToEntity(detailDto),
    );
    product.tags = request.tags.map((tagDto) =>
      TagsRequestMapper.dtoToEntity(tagDto),
    );
    return product;
  }

  static updateEntityFromDto(
    product: Product,
    request: ProductRequestDto,
  ): Product {
    product.name = request.name ?? product.name;
    product.description = request.description ?? product.description;

    if (request.categoryId) {
      product.category = { id: request.categoryId } as Category;
    }

    if (request.hasOwnProperty('subcategoryId')) {
      product.subcategory = request.subcategoryId
        ? ({ id: request.subcategoryId } as Category)
        : null;
    }

    if (request.productDetail && request.productDetail.length > 0) {
      product.productDetail = request.productDetail.map((detailDto) =>
        ProductDetailRequestMapper.dtoToEntity(detailDto),
      );
    } else if (request.productDetail) {
      product.productDetail = [];
    }
    if (request.tags && request.tags.length > 0) {
      product.tags = request.tags.map((tagDto) =>
        TagsRequestMapper.dtoToEntity(tagDto),
      );
    } else if (request.tags) {
      product.tags = [];
    }

    return product;
  }
}
