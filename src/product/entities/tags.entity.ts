import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Category } from 'src/category/entities/category.entity';

@Entity('tags')
export class Tags {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToMany(() => Product, (product) => product.tags)
  products: Product[];

  @ManyToMany(() => Category, (category) => category.tags)
  categories: Category[];
}
