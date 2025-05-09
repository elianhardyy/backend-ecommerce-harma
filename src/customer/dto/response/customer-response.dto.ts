import { Customer } from 'src/customer/entities/customer.entity';
import {
  UserResponse,
  UserResponseDto,
} from 'src/user/dto/response/user-response.dto';

export class CustomerResponseDto {
  phone: string;
  address: string;
  profilePicture: string;
  user: UserResponseDto;
}

export class CustomerResponse {
  static toCustomerResponse(customer: Customer): CustomerResponseDto {
    const customerResponse = new CustomerResponseDto();
    customerResponse.phone = customer.phone;
    customerResponse.address = customer.address;
    customerResponse.profilePicture = customer.profilePicture;

    const userResponse = UserResponse.toUserResponse(customer.user);
    customerResponse.user = userResponse;
    return customerResponse;
  }
}
