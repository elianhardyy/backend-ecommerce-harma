import { forwardRef, Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    //forwardRef(() => UserModule),
    AwsS3Module,
    TypeOrmModule.forFeature([Customer, User]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, TypeOrmModule],
  exports: [CustomerService],
})
export class CustomerModule {}
