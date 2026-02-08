import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Category } from './category.entity';
import { ProviderCategory } from '../../providers/entities/provider-category.entity';

@Entity('sub_categories')
@Unique(['categoryId', 'slug'])
@Index(['categoryId'])
export class SubCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Category, (category) => category.subCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProviderCategory, (pc) => pc.subCategory)
  providerCategories: ProviderCategory[];
}
