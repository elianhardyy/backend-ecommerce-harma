import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTransactionItemDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @Min(1)
  quantity: number;
}

export class CustomerDetailsDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  // Add specific phone validation if needed, e.g. @IsPhoneNumber('ID')
  @IsString()
  phone: string;
}

export class CreateTransactionDto {
  // userId will typically be extracted from the authenticated user (JWT)
  // and not passed in the DTO directly by the client for security.

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  @IsNotEmpty({ each: true })
  items: CreateTransactionItemDto[];

  @IsOptional()
  @IsString()
  shippingAddress?: string; // Or a more structured address object

  @IsOptional()
  @IsString()
  billingAddress?: string; // Or a more structured address object

  @IsOptional()
  @IsString()
  notes?: string;

  // These details are for Midtrans
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails?: CustomerDetailsDto; // If not provided, try to get from User entity
}
