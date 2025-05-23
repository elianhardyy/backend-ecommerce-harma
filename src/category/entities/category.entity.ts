import { Product } from 'src/product/entities/product.entity';
import { Tags } from 'src/product/entities/tags.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @Column({ length: 100 })
  description: string;

  @OneToMany(() => Product, (product) => product.category, {
    eager: true,
    cascade: true,
  })
  products: Product[];

  @ManyToMany(() => Tags, (tags) => tags.categories, { cascade: true })
  @JoinTable()
  tags: Tags[];

  @DeleteDateColumn()
  deletedAt: Date;
}
