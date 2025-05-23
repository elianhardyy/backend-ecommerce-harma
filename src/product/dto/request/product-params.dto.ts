import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsNumber,
} from 'class-validator';

export class ProductParamsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  subCategoryName?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string | 'id' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsString()
  direction?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';
}
