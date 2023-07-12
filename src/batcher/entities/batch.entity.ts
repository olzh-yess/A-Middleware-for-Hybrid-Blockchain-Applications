// batch.entity.ts

import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity()
export class Batch {
    @PrimaryGeneratedColumn()
    batchNonce!: number;
   
    @OneToMany(type => Transaction, transaction => transaction.batchNonce)
    transactions? : Transaction[];
}
