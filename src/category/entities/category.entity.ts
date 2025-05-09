import { Product } from 'src/product/entities/product.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 100 })
  description: string;

  @OneToMany(() => Product, (product) => product.category, {
    eager: true,
    cascade: true,
  })
  @DeleteDateColumn()
  deletedAt: Date;

  products: Product[];
}
