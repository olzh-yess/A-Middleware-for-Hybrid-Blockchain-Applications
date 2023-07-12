import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';
import { UsersService } from './user/user.service';
import { UsersController } from './user/user.controller';
import { BatcherService } from './batcher/batcher.service';
import { BatcherModule } from './batcher/batcher.module';
import { Batch } from './batcher/entities/batch.entity';
import { Transaction } from './batcher/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'mydb.sql',
      entities: [User, Batch, Transaction],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Batch, Transaction]),
    BatcherModule
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, UsersService, BatcherService],
})
export class AppModule { }