import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionDetail } from './entities/transaction.detail.entity';
import { User } from 'src/user/entities/user.entity';
import { Product } from 'src/product/entities/product.entity';
import { ProductDetail } from 'src/product/entities/product.detail.entity'; // Assuming this is where stock/price is
import { ConfigService } from '@nestjs/config';
import * as MidtransClient from 'midtrans-client'; // Use ESM import style if your tsconfig allows

import { Customer } from 'src/customer/entities/customer.entity';
import { TransactionResponseDto } from './dto/response/transaction.response.dto';
import { CreateTransactionDto } from './dto/request/transaction-request.dto';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransactionDetailResponseDto } from './dto/response/transaction-detail.response.dto';
import { JwtClaims } from 'src/guard/jwt.claims';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private midtransSnap: MidtransClient.Snap;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionDetail)
    private transactionDetailRepository: Repository<TransactionDetail>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductDetail) // To check stock and price
    private productDetailRepository: Repository<ProductDetail>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private configService: ConfigService,
    private dataSource: DataSource, // For database transactions
  ) {
    this.midtransSnap = new MidtransClient.Snap({
      isProduction:
        this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
    currentUser: JwtClaims,
  ): Promise<TransactionResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let newTransaction: Transaction;
    let totalAmount = 0;
    const midtransItemDetails = [];
    const createdTransactionDetails: TransactionDetail[] = [];

    try {
      for (const item of createTransactionDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          relations: ['productDetail'],
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found.`,
          );
        }

        const activeProductDetail = product.productDetail?.find(
          (pd) =>
            pd.stock >= item.quantity &&
            !pd.isExpired() &&
            pd.deletedAt === null,
        );

        if (!activeProductDetail) {
          throw new BadRequestException(
            `Product ${product.name} is out of stock, expired, or not available in the requested quantity.`,
          );
        }

        if (activeProductDetail.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product ${product.name}. Available: ${activeProductDetail.stock}, Requested: ${item.quantity}`,
          );
        }

        const subtotal = activeProductDetail.price * item.quantity;
        totalAmount += subtotal;

        const transactionDetail = queryRunner.manager.create(
          TransactionDetail,
          {
            product: product,
            productId: product.id,
            productNameSnapshot: product.name,
            quantity: item.quantity,
            unitPrice: activeProductDetail.price,
            subtotal: subtotal,
          },
        );
        createdTransactionDetails.push(transactionDetail);

        // For Midtrans
        midtransItemDetails.push({
          id: product.id,
          price: activeProductDetail.price,
          quantity: item.quantity,
          name: product.name.substring(0, 50),
        });

        activeProductDetail.stock -= item.quantity;
        await queryRunner.manager.save(ProductDetail, activeProductDetail);
      }

      if (createdTransactionDetails.length === 0) {
        throw new BadRequestException(
          'Transaction must include at least one item.',
        );
      }
      const user = await this.userRepository.findOne({
        where: { id: currentUser.id },
      });
      newTransaction = queryRunner.manager.create(Transaction, {
        user: user,
        userId: user.id,
        totalAmount: totalAmount,
        status: TransactionStatus.PENDING,
        shippingAddress: createTransactionDto.shippingAddress,
        billingAddress: createTransactionDto.billingAddress,
        notes: createTransactionDto.notes,
      });
      await queryRunner.manager.save(Transaction, newTransaction);

      for (const detail of createdTransactionDetails) {
        detail.transaction = newTransaction;
        detail.transactionId = newTransaction.id;
        await queryRunner.manager.save(TransactionDetail, detail);
      }
      newTransaction.transactionDetails = createdTransactionDetails;
      let customerDetailsForMidtrans: MidtransClient.CustomerDetails;
      if (createTransactionDto.customerDetails) {
        customerDetailsForMidtrans = {
          first_name: createTransactionDto.customerDetails.firstName,
          last_name: createTransactionDto.customerDetails.lastName,
          email: createTransactionDto.customerDetails.email,
          phone: createTransactionDto.customerDetails.phone,
        };
      } else {
        const customerProfile = await queryRunner.manager.findOne(Customer, {
          where: { user: { id: currentUser.id } },
          relations: { user: true },
        });
        customerDetailsForMidtrans = {
          first_name: customerProfile.user.fullName.split(' ')[0],
          last_name:
            customerProfile.user.fullName.split(' ').slice(1).join(' ') ||
            customerProfile.user.fullName.split(' ')[0],
          email: customerProfile.user.email,
          phone: customerProfile?.phone || 'N/A',
        };
      }

      const midtransParameter: MidtransClient.SnapTransactionParam = {
        transaction_details: {
          order_id: newTransaction.id,
          gross_amount: totalAmount,
        },
        item_details: midtransItemDetails,
        customer_details: customerDetailsForMidtrans,
        callbacks: {
          finish: `${this.configService.get<string>('APP_BASE_URL')}/payment/finish?order_id=${newTransaction.id}`,
          // error: `${this.configService.get<string>('APP_BASE_URL')}/payment/error?order_id=${newTransaction.id}`,
          // pending: `${this.configService.get<string>('APP_BASE_URL')}/payment/pending?order_id=${newTransaction.id}`,
        },
      };

      this.logger.log(
        `Creating Midtrans transaction for order ID: ${newTransaction.id}`,
      );
      const midtransResponse =
        await this.midtransSnap.createTransaction(midtransParameter);

      await queryRunner.commitTransaction();

      return this.mapTransactionToResponseDto(
        newTransaction,
        midtransResponse.token,
        midtransResponse.redirect_url,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction creation failed: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create transaction. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateTransactionStatusFromMidtrans(notification: any): Promise<void> {
    this.logger.log(
      'Received Midtrans notification:',
      JSON.stringify(notification),
    );

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    const paymentType = notification.payment_type;

    const transaction = await this.transactionRepository.findOne({
      where: { id: orderId },
      relations: [
        'transactionDetails',
        'transactionDetails.product',
        'transactionDetails.product.productDetail',
      ],
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction with order_id: ${orderId} not found for Midtrans notification.`,
      );
      return;
    }

    if (
      [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
        TransactionStatus.REFUNDED,
      ].includes(transaction.status) &&
      transactionStatus !== 'refund' &&
      transactionStatus !== 'partial_refund' &&
      transactionStatus !== 'chargeback' &&
      transactionStatus !== 'partial_chargeback'
    ) {
      this.logger.log(
        `Transaction ${orderId} already in final state ${transaction.status}. Midtrans status: ${transactionStatus}. Skipping update.`,
      );
      return;
    }

    let newStatus: TransactionStatus = transaction.status;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        newStatus = TransactionStatus.COMPLETED;
      } else if (fraudStatus === 'challenge') {
        newStatus = TransactionStatus.PENDING;
        this.logger.log(
          `Transaction ${orderId} challenged by fraud detection.`,
        );
      } else {
        newStatus = TransactionStatus.FAILED;
      }
    } else if (transactionStatus === 'settlement') {
      newStatus = TransactionStatus.COMPLETED;
    } else if (transactionStatus === 'pending') {
      newStatus = TransactionStatus.PENDING;
    } else if (transactionStatus === 'deny') {
      newStatus = TransactionStatus.FAILED;
    } else if (transactionStatus === 'expire') {
      newStatus = TransactionStatus.FAILED;
    } else if (transactionStatus === 'cancel') {
      newStatus = TransactionStatus.CANCELLED;
    } else if (
      transactionStatus === 'refund' ||
      transactionStatus === 'partial_refund'
    ) {
      newStatus = TransactionStatus.REFUNDED;
    } else if (
      transactionStatus === 'chargeback' ||
      transactionStatus === 'partial_chargeback'
    ) {
      newStatus = TransactionStatus.REFUNDED;
    }

    if (transaction.status !== newStatus) {
      transaction.status = newStatus;
      transaction.paymentMethod = paymentType;
      if (
        [TransactionStatus.FAILED, TransactionStatus.CANCELLED].includes(
          newStatus,
        ) &&
        ![TransactionStatus.FAILED, TransactionStatus.CANCELLED].includes(
          transaction.status,
        )
      ) {
        this.logger.log(
          `Restoring stock for failed/cancelled transaction ${orderId}`,
        );
        await this.adjustStockForTransaction(transaction, 'increment');
      }

      await this.transactionRepository.save(transaction);
      this.logger.log(`Transaction ${orderId} status updated to ${newStatus}`);

      if (newStatus === TransactionStatus.COMPLETED) {
        this.logger.log(
          `Order ${orderId} is complete. Triggering fulfillment processes...`,
        );
      }
    } else {
      this.logger.log(
        `Transaction ${orderId} status (${transaction.status}) unchanged by Midtrans notification (${transactionStatus}).`,
      );
    }
  }

  async getTransactionById(
    id: string,
    userId?: string,
  ): Promise<TransactionResponseDto> {
    const findOptions: any = {
      where: { id },
      relations: ['transactionDetails', 'user'],
    };
    if (userId) {
      findOptions.where.userId = userId;
    }

    const transaction = await this.transactionRepository.findOne(findOptions);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found.`);
    }
    return this.mapTransactionToResponseDto(transaction);
  }

  private mapTransactionToResponseDto(
    transaction: Transaction,
    snapToken?: string,
    redirectUrl?: string,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      totalAmount: transaction.totalAmount,
      status: transaction.status,
      snapToken: snapToken,
      redirectUrl: redirectUrl,
      paymentMethod: transaction.paymentMethod,
      shippingAddress: transaction.shippingAddress,
      billingAddress: transaction.billingAddress,
      notes: transaction.notes,
      transactionDetails:
        transaction.transactionDetails?.map(
          (td) =>
            ({
              id: td.id,
              productId: td.productId,
              productNameSnapshot: td.productNameSnapshot,
              quantity: td.quantity,
              unitPrice: +td.unitPrice,
              subtotal: +td.subtotal,
            }) as TransactionDetailResponseDto,
        ) || [],
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  private async adjustStockForTransaction(
    transaction: Transaction,
    operation: 'increment' | 'decrement',
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const detail of transaction.transactionDetails) {
        const productWithDetails = await queryRunner.manager.findOne(Product, {
          where: { id: detail.productId },
          relations: ['productDetail'],
        });

        if (
          !productWithDetails ||
          !productWithDetails.productDetail ||
          productWithDetails.productDetail.length === 0
        ) {
          this.logger.warn(
            `Product or ProductDetail not found for product ID ${detail.productId} during stock adjustment for transaction ${transaction.id}`,
          );
          continue;
        }
        const productDetailToAdjust = productWithDetails.productDetail.find(
          (pd) => pd.deletedAt === null,
        );

        if (productDetailToAdjust) {
          if (operation === 'increment') {
            productDetailToAdjust.stock += detail.quantity;
          } else {
            if (productDetailToAdjust.stock < detail.quantity) {
              this.logger.error(
                `Stock adjustment error: Insufficient stock for product ${detail.productId} to decrement by ${detail.quantity}. Available: ${productDetailToAdjust.stock}`,
              );
              continue;
            }
            productDetailToAdjust.stock -= detail.quantity;
          }
          await queryRunner.manager.save(ProductDetail, productDetailToAdjust);
          this.logger.log(
            `Stock for ProductDetail ${productDetailToAdjust.id} (Product ${detail.productId}) ${operation}ed by ${detail.quantity}. New stock: ${productDetailToAdjust.stock}`,
          );
        } else {
          this.logger.warn(
            `No active ProductDetail found for product ID ${detail.productId} to adjust stock.`,
          );
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to adjust stock for transaction ${transaction.id}: ${error.message}`,
        error.stack,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
