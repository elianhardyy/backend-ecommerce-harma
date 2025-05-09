import { Category } from 'src/category/entities/category.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductDetail } from './product.detail.entity';
import { Cart } from 'src/cart/entities/cart.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToOne(() => Category, (category) => category.products)
  category: Category;

  @OneToMany(() => ProductDetail, (productDetail) => productDetail.product, {
    eager: true,
    cascade: true,
  })
  productDetail: ProductDetail[];

  @OneToMany(() => Cart, (cart) => cart.product, { eager: true, cascade: true })
  carts: Cart[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
