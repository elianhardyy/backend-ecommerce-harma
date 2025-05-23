import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductRequestDto,
  ProductRequestMapper, // Will be used carefully or parts replaced by service logic
  ProductDetailRequestMapper, // For productDetail mapping
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
import { CategoryService } from 'src/category/category.service';
import { ProductDetail } from './entities/product.detail.entity';
import { Tags } from './entities/tags.entity';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tags)
    private readonly tagsRepository: Repository<Tags>,
    private readonly categoryService: CategoryService,
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

    if (request.tags && request.tags.length > 0) {
      const resolvedTags: Tags[] = [];
      for (const tagDto of request.tags) {
        let tag = await this.tagsRepository.findOneBy({ name: tagDto.name });
        if (!tag) {
          tag = this.tagsRepository.create({ name: tagDto.name });
        }
        resolvedTags.push(tag);
      }
      productEntity.tags = resolvedTags;
    }

    if (file) {
      const fileUrl = await this.awsS3Service.uploadFile(file, 'product');
      productEntity.imageUrl = fileUrl;
    } else {
      productEntity.imageUrl = null;
    }

    try {
      const createdProduct = await this.productRepository.save(productEntity);

      if (createdProduct.tags && createdProduct.tags.length > 0) {
        const productTags = createdProduct.tags;

        if (request.categoryId) {
          const category = await this.categoryRepository.findOne({
            where: { id: request.categoryId },
            relations: ['tags'],
          });
          if (category) {
            const categoryTagIds = new Set(category.tags.map((t) => t.id));
            let categoryTagsUpdated = false;
            for (const productTag of productTags) {
              if (productTag.id && !categoryTagIds.has(productTag.id)) {
                category.tags.push(productTag);
                categoryTagsUpdated = true;
              }
            }
            if (categoryTagsUpdated) {
              await this.categoryRepository.save(category);
            }
          }
        }

        if (request.subcategoryId) {
          const subcategory = await this.categoryRepository.findOne({
            where: { id: request.subcategoryId },
            relations: ['tags'],
          });
          if (subcategory) {
            const subCategoryTagIds = new Set(
              subcategory.tags.map((t) => t.id),
            );
            let subCategoryTagsUpdated = false;
            for (const productTag of productTags) {
              if (productTag.id && !subCategoryTagIds.has(productTag.id)) {
                subcategory.tags.push(productTag);
                subCategoryTagsUpdated = true;
              }
            }
            if (subCategoryTagsUpdated) {
              await this.categoryRepository.save(subcategory);
            }
          }
        }
      }

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
        tags: tagsParam,
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
        .leftJoinAndSelect('product.productDetail', 'productDetail')
        .leftJoinAndSelect('product.tags', 'tags');

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

      if (tagsParam) {
        const tagNames = tagsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        if (tagNames.length > 0) {
          queryBuilder.andWhere('tags.name IN (:...tagNames)', { tagNames });
        }
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
    const productToUpdate = await this.findProductByIdWithRelations(id);
    if (!productToUpdate) {
      throw new NotFoundException(
        `Product with ID "${id}" not found for update.`,
      );
    }

    const effectiveCategoryId =
      request.categoryId ?? productToUpdate.category?.id;
    let effectiveSubcategoryId = productToUpdate.subcategory?.id;
    if (Object.prototype.hasOwnProperty.call(request, 'subcategoryId')) {
      effectiveSubcategoryId = request.subcategoryId;
    }

    if (
      request.categoryId ||
      Object.prototype.hasOwnProperty.call(request, 'subcategoryId')
    ) {
      await this.validateCategoryExistence(
        effectiveCategoryId,
        effectiveSubcategoryId,
      );
      await this.validateCategoryHierarchy(
        effectiveCategoryId,
        effectiveSubcategoryId,
      );
    }

    let fileUrl = productToUpdate.imageUrl;
    if (file) {
      if (productToUpdate.imageUrl) {
        try {
          await this.awsS3Service.deleteFile(productToUpdate.imageUrl);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old product picture: ${error.message}`,
          );
        }
      }
      fileUrl = await this.awsS3Service.uploadFile(file, 'product');
    }
    productToUpdate.imageUrl = fileUrl;

    productToUpdate.name = request.name ?? productToUpdate.name;
    productToUpdate.description =
      request.description ?? productToUpdate.description;

    if (request.categoryId) {
      productToUpdate.category = { id: request.categoryId } as Category;
    }

    if (Object.prototype.hasOwnProperty.call(request, 'subcategoryId')) {
      productToUpdate.subcategory = request.subcategoryId
        ? ({ id: request.subcategoryId } as Category)
        : null;
    }

    if (request.productDetail) {
      productToUpdate.productDetail = request.productDetail.map((detailDto) =>
        ProductDetailRequestMapper.dtoToEntity(detailDto),
      );
    }

    if (Object.prototype.hasOwnProperty.call(request, 'tags')) {
      const resolvedTags: Tags[] = [];
      if (request.tags && request.tags.length > 0) {
        for (const tagDto of request.tags) {
          let tagEntity = await this.tagsRepository.findOneBy({
            name: tagDto.name,
          });
          if (!tagEntity) {
            tagEntity = this.tagsRepository.create({ name: tagDto.name });
          }
          resolvedTags.push(tagEntity);
        }
      }
      productToUpdate.tags = resolvedTags;
    }

    try {
      const savedProduct = await this.productRepository.save(productToUpdate);

      if (savedProduct.tags && savedProduct.tags.length > 0) {
        const productTags = savedProduct.tags;

        if (effectiveCategoryId) {
          const category = await this.categoryRepository.findOne({
            where: { id: effectiveCategoryId },
            relations: ['tags'],
          });
          if (category) {
            const categoryTagIds = new Set(category.tags.map((t) => t.id));
            let categoryTagsUpdated = false;
            for (const productTag of productTags) {
              if (productTag.id && !categoryTagIds.has(productTag.id)) {
                category.tags.push(productTag);
                categoryTagsUpdated = true;
              }
            }
            if (categoryTagsUpdated) {
              await this.categoryRepository.save(category);
            }
          }
        }

        if (effectiveSubcategoryId) {
          const subcategory = await this.categoryRepository.findOne({
            where: { id: effectiveSubcategoryId },
            relations: ['tags'],
          });
          if (subcategory) {
            const subCategoryTagIds = new Set(
              subcategory.tags.map((t) => t.id),
            );
            let subCategoryTagsUpdated = false;
            for (const productTag of productTags) {
              if (productTag.id && !subCategoryTagIds.has(productTag.id)) {
                subcategory.tags.push(productTag);
                subCategoryTagsUpdated = true;
              }
            }
            if (subCategoryTagsUpdated) {
              await this.categoryRepository.save(subcategory);
            }
          }
        }
      }

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
      relations: ['category', 'subcategory', 'productDetail', 'tags'],
    });
  }
}
