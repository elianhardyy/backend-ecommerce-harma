import {
  Check,
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_details')
@Check(`"stock" >= 0`)
@Check(`"price" >= 0`)
export class ProductDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'timestamp' })
  expiredAt: Date;

  @ManyToOne(() => Product, (product) => product.productDetail)
  product: Product;

  @DeleteDateColumn()
  deletedAt: Date;

  isExpired(): boolean {
    return new Date() > this.expiredAt;
  }
}
