import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';

import { JwtAuthGuard } from 'src/guard/jwt.guard';
import { CurrentUser } from 'src/decorator/current-user.decorator';
import { CreateTransactionDto } from './dto/request/transaction-request.dto';
import { Roles } from 'src/decorator/roles.decorator';
import { UserRole } from 'src/user/enums/user.role';
import { JwtClaims } from 'src/guard/jwt.claims';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: JwtClaims,
  ) {
    return this.transactionService.createTransaction(
      createTransactionDto,
      user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionService.getTransactionById(id, user);
  }

  @Post('midtrans/notification')
  @HttpCode(HttpStatus.OK)
  async handleMidtransNotification(@Body() notificationPayload: any) {
    await this.transactionService.updateTransactionStatusFromMidtrans(
      notificationPayload,
    );
  }
}
