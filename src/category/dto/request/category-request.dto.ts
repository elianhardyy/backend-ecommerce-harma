import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Category } from 'src/category/entities/category.entity';

export class CategoryRequestDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Category description' })
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CategoryRequest {
  static toCategoryEntity(request: CategoryRequestDto): Category {
    const category = new Category();
    category.name = request.name;
    category.description = request.description;
    return category;
  }
}
