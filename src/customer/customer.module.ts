import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';

@Module({
  imports: [UserModule, AwsS3Module, TypeOrmModule.forFeature([Customer])],
  controllers: [CustomerController],
  providers: [CustomerService, TypeOrmModule],
})
export class CustomerModule {}
