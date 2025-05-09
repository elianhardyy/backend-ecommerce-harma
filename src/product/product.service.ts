import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductRequest,
  ProductRequestDto,
} from './dto/request/product-request.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import {
  ProductResponse,
  ProductResponseDto,
} from './dto/response/product-response.dto';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { PagingResponse } from 'src/api/response/paging.response';
import { ProductParamsDto } from './dto/request/product-params.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly awsS3Service: AwsS3Service,
  ) {}
  async create(
    request: ProductRequestDto,
    file: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    try {
      const product = ProductRequest.toProductEntity(request);
      if (product.imageUrl) {
        try {
          await this.awsS3Service.deleteFile(product.imageUrl);
        } catch (error) {
          console.warn(`Failed to delete: ${error.message}`);
        }
      }
      const fileUrl = await this.awsS3Service.uploadFile(file, 'product');
      product.imageUrl = fileUrl;
      const createdProduct = await this.productRepository.save(product);
      return ProductResponse.toProductResponse(createdProduct);
    } catch (error) {
      throw new ConflictException('Failed to create product');
    }
  }

  async findAll(params?: ProductParamsDto): Promise<{
    data: ProductResponseDto[];
    paging: PagingResponse;
  }> {
    try {
      const {
        name,
        categoryName,
        page = 1,
        limit = 10,
        sortBy = 'id',
        direction = 'ASC',
      } = params || {};
      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.productDetail', 'productDetail');

      if (name) {
        queryBuilder.andWhere('product.name LIKE :name', { name: `%${name}%` });
      }
      if (categoryName) {
        queryBuilder.andWhere('category.name LIKE :categoryName', {
          categoryName: `%${categoryName}%`,
        });
      }
      const total = await queryBuilder.getCount();

      queryBuilder
        .orderBy(`product.${sortBy}`, direction.toUpperCase() as 'ASC' | 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const products = await queryBuilder.getMany();

      const productResponses = products.map((product) =>
        ProductResponse.toProductResponse(product),
      );
      const paging = PagingResponse.of(page, limit, total);

      return {
        data: productResponses,
        paging,
      };
    } catch (error) {
      throw new ConflictException('Failed to retrieve products');
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: ProductRequestDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
