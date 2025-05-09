import { Category } from 'src/category/entities/category.entity';

export class CategoryResponseDto {
  id: string;
  name: string;
  description: string;
}

export class CategoryResponse {
  static toCategoryResponse(category: Category): CategoryResponseDto {
    const categoryResponse = new CategoryResponseDto();
    categoryResponse.id = category.id;
    categoryResponse.name = category.name;
    categoryResponse.description = category.description;
    return categoryResponse;
  }
}
