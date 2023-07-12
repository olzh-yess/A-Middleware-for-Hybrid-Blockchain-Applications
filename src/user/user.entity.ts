import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  publicKey!: string;

  @Column({ nullable: true })
  sepoliaProxyAccount!: string;

  @Column({ nullable: true })
  ganacheProxyAccount!: string;

  @Column()
  ganacheProxyKey!: string;
}