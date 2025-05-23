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
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { JwtClaims } from 'src/guard/jwt.claims';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly awsS3Service: AwsS3Service,
  ) {}
  async create(
    request: CustomerRequestDto,
    currentUser: JwtClaims,
  ): Promise<CustomerResponseDto> {
    let customer = await this.customerRepository.findOne({
      where: { user: { id: currentUser.id } },
    });
    try {
      const updatedCustomer = CustomerRequest.toCustomerUpdateEntity(
        customer,
        request,
      );
      // if (customer) {
      // } else {
      //   customer = this.customerRepository.create({
      //     phone: request.phone,
      //     address: request.address,
      //     user: { id: currentUser.id },
      //   });
      // }
      const savedCustomer = await this.customerRepository.save(updatedCustomer);
      const finalCustomer = await this.customerRepository.findOne({
        where: { id: savedCustomer.id },
        relations: { user: true },
      });
      return CustomerResponse.toCustomerResponse(finalCustomer);
    } catch (error) {
      throw new Error('error update customer');
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
