import {
  BadRequestException, // Added
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductRequestDto,
  ProductRequestMapper,
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
import { Category } from 'src/category/entities/category.entity';
import { CategoryService } from 'src/category/category.service'; // Import CategoryService

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>, // Still useful for general ID validation
    private readonly categoryService: CategoryService, // Inject CategoryService
    private readonly awsS3Service: AwsS3Service,
  ) {}

  private async validateCategoryExistence(
    categoryId?: string,
    subcategoryId?: string | null,
  ): Promise<void> {
    if (categoryId) {
      const categoryExists = await this.categoryRepository.findOneBy({
        id: categoryId,
      });
      if (!categoryExists) {
        throw new NotFoundException(
          `Category with ID "${categoryId}" not found.`,
        );
      }
    }
    if (subcategoryId) {
      const subcategoryExists = await this.categoryRepository.findOneBy({
        id: subcategoryId,
      });
      if (!subcategoryExists) {
        throw new NotFoundException(
          `Subcategory with ID "${subcategoryId}" not found.`,
        );
      }
    }
  }

  private async validateCategoryHierarchy(
    categoryId?: string,
    subcategoryId?: string | null,
  ): Promise<void> {
    if (categoryId && subcategoryId) {
      // Only validate if both are present
      const isCorrectHierarchy = await this.categoryService.isDirectChild(
        categoryId,
        subcategoryId,
      );
      if (!isCorrectHierarchy) {
        throw new BadRequestException(
          `Subcategory (ID: ${subcategoryId}) is not a direct child of Category (ID: ${categoryId}).`,
        );
      }
    }
  }

  async create(
    request: ProductRequestDto,
    file: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    await this.validateCategoryExistence(
      request.categoryId,
      request.subcategoryId,
    );
    await this.validateCategoryHierarchy(
      request.categoryId,
      request.subcategoryId,
    );

    const productEntity = ProductRequestMapper.dtoToEntity(request);

    if (file) {
      const fileUrl = await this.awsS3Service.uploadFile(file, 'product');
      productEntity.imageUrl = fileUrl;
    } else {
      productEntity.imageUrl = null;
    }

    try {
      const createdProduct = await this.productRepository.save(productEntity);
      const fullProduct = await this.findProductByIdWithRelations(
        createdProduct.id,
      );
      if (!fullProduct) {
        throw new InternalServerErrorException(
          'Failed to retrieve created product with relations.',
        );
      }
      return ProductResponse.toProductResponse(fullProduct);
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create product. Please check logs.',
      );
    }
  }

  async findAll(params?: ProductParamsDto): Promise<{
    data: ProductResponseDto[];
    paging: PagingResponse;
  }> {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        categoryName,
        subCategoryName,
        page = 1,
        size = 10,
        sortBy = 'createdAt',
        direction = 'DESC',
      } = params || {};

      this.logger.debug(
        `findAll called with params: ${JSON.stringify(params)}`,
      );

      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.subcategory', 'subcategory_alias')
        .leftJoinAndSelect('product.productDetail', 'productDetail');

      if (name) {
        queryBuilder.andWhere('product.name LIKE :name', { name: `%${name}%` });
      }
      if (categoryName) {
        queryBuilder.andWhere('category.name LIKE :categoryName', {
          categoryName: `%${categoryName}%`,
        });
      }
      if (subCategoryName) {
        queryBuilder.andWhere('subcategory_alias.name LIKE :subCategoryName', {
          subCategoryName: `%${subCategoryName}%`,
        });
      }

      if (
        minPrice !== undefined &&
        !Number.isNaN(parseFloat(minPrice as any))
      ) {
        queryBuilder.andWhere('productDetail.price >= :minPriceValue', {
          minPriceValue: parseFloat(minPrice as any),
        });
      }

      if (
        maxPrice !== undefined &&
        !Number.isNaN(parseFloat(maxPrice as any))
      ) {
        queryBuilder.andWhere('productDetail.price <= :maxPriceValue', {
          maxPriceValue: parseFloat(maxPrice as any),
        });
      }

      const total = await queryBuilder.getCount();

      const sortableColumns: Record<string, string> = {
        id: 'product.id',
        name: 'product.name',
        price: 'productDetail.price',
        categoryName: 'category.name',
        subCategoryName: 'subcategory_alias.name',
        createdAt: 'product.createdAt',
        updatedAt: 'product.updatedAt',
      };

      const sortColumnPath =
        sortableColumns[sortBy] || sortableColumns['createdAt'];

      queryBuilder
        .orderBy(sortColumnPath, direction.toUpperCase() as 'ASC' | 'DESC')
        .skip((page - 1) * size)
        .take(size);

      this.logger.debug(`Executing query: ${queryBuilder.getSql()}`);

      const products = await queryBuilder.getMany();

      const productResponses = products.map((product) =>
        ProductResponse.toProductResponse(product),
      );
      const paging = PagingResponse.of(page, size, total);

      return {
        data: productResponses,
        paging,
      };
    } catch (error) {
      this.logger.error(
        'Failed to retrieve products in ProductService:',
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve products');
    }
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.findProductByIdWithRelations(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return ProductResponse.toProductResponse(product);
  }

  async update(
    id: string,
    request: ProductRequestDto,
    file?: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    const product = await this.findProductByIdWithRelations(id);
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${id}" not found for update.`,
      );
    }

    // Determine effective category and subcategory for validation
    const effectiveCategoryId = request.categoryId ?? product.category?.id;
    let effectiveSubcategoryId = product.subcategory?.id; // Default to existing
    if (request.hasOwnProperty('subcategoryId')) {
      // If subcategoryId is explicitly in the request payload
      effectiveSubcategoryId = request.subcategoryId;
    }

    // Validate existence of the effective IDs first
    await this.validateCategoryExistence(
      effectiveCategoryId,
      effectiveSubcategoryId,
    );
    // Then validate the hierarchy
    await this.validateCategoryHierarchy(
      effectiveCategoryId,
      effectiveSubcategoryId,
    );

    let fileUrl = product.imageUrl;
    if (file) {
      if (product.imageUrl) {
        try {
          await this.awsS3Service.deleteFile(product.imageUrl);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old product picture: ${error.message}`,
          );
        }
      }
      fileUrl = await this.awsS3Service.uploadFile(file, 'product');
    }

    const updatedProductEntity = ProductRequestMapper.updateEntityFromDto(
      product,
      request,
    );
    updatedProductEntity.imageUrl = fileUrl;

    try {
      const savedProduct =
        await this.productRepository.save(updatedProductEntity);
      const fullProduct = await this.findProductByIdWithRelations(
        savedProduct.id,
      );
      if (!fullProduct) {
        throw new InternalServerErrorException(
          'Failed to retrieve updated product with relations.',
        );
      }
      return ProductResponse.toProductResponse(fullProduct);
    } catch (error) {
      this.logger.error(
        `Product update failed for ID "${id}": ${error.message}`,
        error.stack,
      );
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Product update failed. Please check logs.`,
      );
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.productRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Product with ID "${id}" not found for deletion.`,
      );
    }
    return { message: 'Product deleted successfully' };
  }

  private async findProductByIdWithRelations(
    id: string,
  ): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['category', 'subcategory', 'productDetail'],
    });
  }
}
