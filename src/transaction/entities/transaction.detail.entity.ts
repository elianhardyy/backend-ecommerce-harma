import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Product } from 'src/product/entities/product.entity';

@Entity('transaction_details')
export class TransactionDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Transaction,
    (transaction) => transaction.transactionDetails,
    { onDelete: 'CASCADE' }, // If a transaction is deleted, its details are also deleted
  )
  transaction: Transaction;

  @Column({ type: 'uuid' }) // Foreign key for transaction
  transactionId: string;

  @ManyToOne(() => Product, (product) => product.transactionDetails, {
    eager: false, // Usually false, load product info as needed
    nullable: true, // In case product gets deleted, we still have historical data
    onDelete: 'SET NULL', // If product is deleted, set product_id to NULL
  })
  product: Product;

  @Column({ type: 'uuid', nullable: true }) // Foreign key for product
  productId: string;

  @Column({ length: 150 })
  productNameSnapshot: string; // Store the name at the time of purchase

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number; // Price of a single unit at the time of purchase

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number; // quantity * unitPrice

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date; // For soft deleting a specific line item if needed, though rare
}
