import { IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';
import { Customer } from 'src/customer/entities/customer.entity';

export class CustomerRequestDto {
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  @MinLength(10, { message: 'Nomor telepon minimal 10 karakter' })
  @MaxLength(16, { message: 'Nomor telepon maksimal 16 karakter' })
  @Matches(/^[0-9]+$/, { message: 'Nomor telepon hanya boleh berisi angka' })
  phone: string;

  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  address: string;
}

export class ProfileRequestDto {
  profilePicture: string;
}

export class CustomerRequest {
  static toCustomerEntity(request: CustomerRequestDto): Customer {
    const customer = new Customer();
    customer.phone = request.phone;
    customer.address = request.address;
    return customer;
  }
}
