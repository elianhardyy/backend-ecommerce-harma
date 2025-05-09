import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
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
    try {
      const category = this.categoryRepository.create(request);
      const savedCategory = await this.categoryRepository.save(category);
      return CategoryResponse.toCategoryResponse(savedCategory);
    } catch (error) {
      throw new Error('Error creating category');
    }
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    try {
      const categories = await this.categoryRepository.find();
      return categories.map((category) =>
        CategoryResponse.toCategoryResponse(category),
      );
    } catch (error) {
      throw new Error('Error retrive categories');
    }
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    try {
      const category = await this.categoryRepository.findOne({ where: { id } });
      return CategoryResponse.toCategoryResponse(category);
    } catch (error) {
      throw new Error('Error retrive category');
    }
  }

  async update(
    id: string,
    request: CategoryRequestDto,
  ): Promise<CategoryResponseDto> {
    try {
      await this.categoryRepository.update(
        { id },
        { name: request.name, description: request.description },
      );

      const updatedCustomer = await this.categoryRepository.findOne({
        where: { id },
      });
      return CategoryResponse.toCategoryResponse(updatedCustomer);
    } catch (error) {
      throw new Error('Error update category');
    }
  }

  async remove(id: string): Promise<string> {
    await this.categoryRepository.softDelete(id);
    return 'Success delete category';
  }
}
