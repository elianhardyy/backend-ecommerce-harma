import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionDetail } from './transaction.detail.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.transactions, { eager: false })
  user: User;

  @Column({ type: 'uuid' }) // Foreign key for user
  userId: string;

  @OneToMany(
    () => TransactionDetail,
    (transactionDetail) => transactionDetail.transaction,
    { cascade: true, eager: true }, // Eager load details, cascade persist/remove
  )
  transactionDetails: TransactionDetail[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ length: 100, nullable: true })
  paymentMethod: string; // e.g., 'credit_card', 'paypal', 'stripe_charge_id'

  @Column({ length: 255, nullable: true })
  shippingAddress: string; // Could be a JSON object or normalized further

  @Column({ length: 255, nullable: true })
  billingAddress: string; // Could be a JSON object or normalized further

  @Column({ nullable: true, type: 'text' })
  notes: string; // Any additional notes for the transaction

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
