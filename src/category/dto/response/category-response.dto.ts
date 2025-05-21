import { ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from 'src/category/entities/category.entity';

export class CategoryResponseDto {
  id: string;
  name: string;
  description: string;
  @ApiPropertyOptional({
    type: () => [CategoryResponseDto],
    description: 'Sub-categories',
  })
  children?: CategoryResponseDto[];
}

export class CategoryResponse {
  static toCategoryResponse(category: Category): CategoryResponseDto {
    const categoryResponse = new CategoryResponseDto();
    categoryResponse.id = category.id;
    categoryResponse.name = category.name;
    categoryResponse.description = category.description;
    if (category.children && category.children.length > 0) {
      categoryResponse.children = category.children.map((child) =>
        CategoryResponse.toCategoryResponse(child),
      );
    } else {
      categoryResponse.children = [];
    }
    return categoryResponse;
  }

  static toCategoryResponseTree(categories: Category[]): CategoryResponseDto[] {
    return categories.map((category) => this.toCategoryResponse(category));
  }
}
