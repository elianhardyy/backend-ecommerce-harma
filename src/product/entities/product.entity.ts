import { Category } from 'src/category/entities/category.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductDetail } from './product.detail.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { TransactionDetail } from 'src/transaction/entities/transaction.detail.entity';
import { Tags } from './tags.entity';

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

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToOne(() => Category, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subcategoryId' })
  subcategory: Category | null;

  @OneToMany(() => ProductDetail, (productDetail) => productDetail.product, {
    eager: true,
    cascade: true,
  })
  productDetail: ProductDetail[];

  @OneToMany(() => Cart, (cart) => cart.product)
  carts: Cart[];

  @OneToMany(
    () => TransactionDetail,
    (transactionDetail) => transactionDetail.product,
  )
  transactionDetails: TransactionDetail[];

  @ManyToMany(() => Tags, (tags) => tags.products, { cascade: true })
  @JoinTable()
  tags: Tags[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
