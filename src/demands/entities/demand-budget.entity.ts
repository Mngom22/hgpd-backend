import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Demand } from './demand.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('demand_budgets')
@Unique(['demandId', 'categoryId'])
@Index(['demandId'])
export class DemandBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'demand_id', type: 'uuid' })
  demandId: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ name: 'min_amount', type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  maxAmount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Demand, (demand) => demand.demandBudgets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'demand_id' })
  demand: Demand;

  @ManyToOne(() => Category, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
