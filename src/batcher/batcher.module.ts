// batcher.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionGateway } from './transaction.gateway';
import { Batch } from './entities/batch.entity';
import { Transaction } from './entities/transaction.entity';
import { BatcherService } from './batcher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Batch, Transaction]),
  ],
  providers: [BatcherService, TransactionGateway],
  exports: [BatcherService, TransactionGateway],
})
export class BatcherModule {}
