import { TransactionStatus } from 'src/transaction/enums/transaction-status.enum';
import { TransactionDetailResponseDto } from './transaction-detail.response.dto';

export class TransactionResponseDto {
  id: string; // Your internal transaction ID
  userId: string;
  totalAmount: number;
  status: TransactionStatus;
  snapToken?: string; // Midtrans Snap token
  redirectUrl?: string; // Midtrans redirect URL (alternative to Snap token)
  paymentMethod?: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  transactionDetails: TransactionDetailResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
