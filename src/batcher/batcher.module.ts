// batcher.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionGateway } from './transaction.gateway';
import { Batch } from './entities/batch.entity';
import { Transaction } from './entities/transaction.entity';
import { BatcherService } from './batcher.service';
import { ServiceBackdoorController } from './service-backdoor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Batch, Transaction]),
  ],
  controllers: [ServiceBackdoorController], 
  providers: [BatcherService, TransactionGateway],
  exports: [BatcherService, TransactionGateway],
})
export class BatcherModule {}
