import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
// import { CreateCategoryDto } from './dto/create-category.dto';
// import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { IsNull, Not, Repository } from 'typeorm';
import {
  CategoryResponse,
  CategoryResponseDto,
} from './dto/response/category-response.dto';
import { CategoryRequestDto } from './dto/request/category-request.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(request: CategoryRequestDto): Promise<CategoryResponseDto> {
    const category = this.categoryRepository.create();
    category.name = request.name;
    category.description = request.description;

    if (request.parentId) {
      const parentCategory = await this.categoryRepository.findOneBy({
        id: request.parentId,
      });
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID "${request.parentId}" not found.`,
        );
      }
      category.parent = parentCategory;
    } else if (
      request.hasOwnProperty('parentId') &&
      request.parentId === null
    ) {
      category.parent = null;
    }

    try {
      const savedCategory = await this.categoryRepository.save(category);
      return CategoryResponse.toCategoryResponse(savedCategory);
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException(
          `Category with name "${request.name}" already exists.`,
        );
      }
      throw new InternalServerErrorException(
        'Error creating category: ' + error.message,
      );
    }
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    try {
      const categories = await this.categoryRepository.find({
        where: { parent: { id: IsNull() } }, // Only top-level categories
        relations: [
          'children',
          'children.children',
          'children.children.children',
          'parent',
        ],
      });
      return categories.map((category) =>
        CategoryResponse.toCategoryResponse(category),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error retrieving categories: ' + error.message,
      );
    }
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children', 'children.children', 'parent'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    return CategoryResponse.toCategoryResponse(category);
  }

  async update(
    id: string,
    request: CategoryRequestDto,
  ): Promise<CategoryResponseDto> {
    let categoryToUpdate = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!categoryToUpdate) {
      throw new NotFoundException(
        `Category with ID "${id}" not found to update.`,
      );
    }

    if (request.name && request.name !== categoryToUpdate.name) {
      const existingByName = await this.categoryRepository.findOne({
        where: { name: request.name, id: Not(id) },
      });
      if (existingByName) {
        throw new ConflictException(
          `Another category with name "${request.name}" already exists.`,
        );
      }
      categoryToUpdate.name = request.name;
    }

    if (request.description !== undefined) {
      categoryToUpdate.description = request.description;
    }

    if (request.hasOwnProperty('parentId')) {
      if (request.parentId === null) {
        categoryToUpdate.parent = null;
      } else {
        if (request.parentId === id) {
          throw new BadRequestException('A category cannot be its own parent.');
        }
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: request.parentId },
        });
        if (!parentCategory) {
          throw new NotFoundException(
            `Parent category with ID "${request.parentId}" not found.`,
          );
        }
        if (await this.isDescendant(parentCategory.id, categoryToUpdate.id)) {
          throw new BadRequestException(
            'Cannot set parent to a descendant category (cyclic hierarchy).',
          );
        }
        categoryToUpdate.parent = parentCategory;
      }
    }

    try {
      const updatedCategoryEntity =
        await this.categoryRepository.save(categoryToUpdate);
      const result = await this.categoryRepository.findOne({
        where: { id: updatedCategoryEntity.id },
        relations: ['children', 'children.children', 'parent'],
      });
      return CategoryResponse.toCategoryResponse(result);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Category name conflict during update.`);
      }
      throw new InternalServerErrorException(
        'Error updating category: ' + error.message,
      );
    }
  }

  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    const categoryToQuery = await this.categoryRepository.findOne({
      where: { id: ancestorId },
      relations: ['children'],
    });

    if (
      !categoryToQuery ||
      !categoryToQuery.children ||
      categoryToQuery.children.length === 0
    ) {
      return false;
    }

    for (const child of categoryToQuery.children) {
      if (child.id === potentialDescendantId) {
        return true;
      }
      if (await this.isDescendant(potentialDescendantId, child.id)) {
        return true;
      }
    }
    return false;
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products', 'children'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        `Category "${category.name}" cannot be deleted because it is associated with products.`,
      );
    }
    if (category.children && category.children.length > 0) {
      throw new ConflictException(
        `Category "${category.name}" cannot be deleted because it has subcategories. Delete subcategories first.`,
      );
    }

    const result = await this.categoryRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Category with ID "${id}" not found for deletion or already deleted.`,
      );
    }
    return { message: 'Category deleted successfully' };
  }

  async isDirectChild(parentId: string, childId: string): Promise<boolean> {
    const childCategory = await this.categoryRepository.findOne({
      where: { id: childId },
      relations: ['parent'],
    });

    if (!childCategory || !childCategory.parent) {
      return false;
    }
    return childCategory.parent.id === parentId;
  }
}
