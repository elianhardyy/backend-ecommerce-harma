import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  CustomerRequest,
  CustomerRequestDto,
  ProfileRequestDto,
} from './dto/request/customer-request.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Repository } from 'typeorm';
import {
  CustomerResponse,
  CustomerResponseDto,
} from './dto/response/customer-response.dto';
import { User } from 'src/user/entities/user.entity';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly awsS3Service: AwsS3Service,
  ) {}
  async create(
    request: CustomerRequestDto,
    currentUser: any,
  ): Promise<CustomerResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: currentUser.id },
      });
      const customer = CustomerRequest.toCustomerEntity(request);
      customer.user = user;
      const savedCustomer = await this.customerRepository.save(customer);
      return CustomerResponse.toCustomerResponse(savedCustomer);
    } catch (error) {
      throw new Error('Error creating customer');
    }
  }

  async updateProfilPicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (!customer) {
      throw new Error(`Customer with user ID ${userId} not found`);
    }
    if (customer.profilePicture) {
      try {
        await this.awsS3Service.deleteFile(customer.profilePicture);
      } catch (error) {
        console.warn(`Failed to delete old profile picture: ${error.message}`);
      }
    }
    const fileUrl = await this.awsS3Service.uploadFile(
      file,
      'customer-profiles',
    );
    customer.profilePicture = fileUrl;
    const savedCustomer = await this.customerRepository.save(customer);
    return CustomerResponse.toCustomerResponse(savedCustomer);
  }

  async customerProfile(user: any): Promise<CustomerResponseDto> {
    try {
      const customer = await this.customerRepository.findOne({
        where: { user: { id: user.id } },
        relations: { user: true },
      });
      return CustomerResponse.toCustomerResponse(customer);
    } catch (error) {
      throw new Error('Error retrieve customer');
    }
  }

  findAll() {}

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return `This action updates a #${id} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
