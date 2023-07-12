import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn()
    positionNonce!: number;

    @Column()
    batchNonce!: number;

    @Column('text')
    txData?: string;

    @Column('text')
    sigUser?: string;

    @Column('text')
    sigOwner?: string;

    @Column('bigint')
    sendTimestamp?: number;

    @Column({type: 'json', nullable: true})
    receipt?: Record<string, any>;  // can be any shape of JSON object
}
