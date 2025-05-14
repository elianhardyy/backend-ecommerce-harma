import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15, nullable: true })
  phone: string;

  @Column({ length: 225, nullable: true })
  address: string;

  @Column({ length: 225, nullable: true })
  profilePicture: string;

  @Column({
    default: true,
  })
  isActive: boolean;

  @OneToOne(() => User, (user) => user.customer)
  @JoinColumn()
  user: User;
}
