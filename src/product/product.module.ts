import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CategoryModule } from 'src/category/category.module';
import { ProductDetail } from './entities/product.detail.entity';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';
import { Tags } from './entities/tags.entity';

@Module({
  imports: [
    AwsS3Module,
    TypeOrmModule.forFeature([Product, ProductDetail, Tags]),
    CategoryModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [TypeOrmModule],
})
export class ProductModule {}
