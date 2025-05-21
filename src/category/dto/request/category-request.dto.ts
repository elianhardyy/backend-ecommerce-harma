import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Category } from 'src/category/entities/category.entity';

export class CategoryRequestDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Parent id' })
  @IsUUID()
  parentId?: string;

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
    if (request.parentId) {
      category.parent = { id: request.parentId } as Category;
    } else if (request.parentId === null) {
      category.parent = null;
    }
    return category;
  }

  // static toUpdateCategoryEntity(category:Category,request:CategoryRequestDto):Category{
  //   category.name = request.name ?? category.name;
  //   category.description = request.description ?? category.description;

  // }
}
