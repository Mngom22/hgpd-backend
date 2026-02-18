import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Provider } from './provider.entity';
import { Category } from '../../categories/entities/category.entity';
import { SubCategory } from '../../categories/entities/sub-category.entity';
import { ProviderCategoryPhoto } from './provider-category-photo.entity';

@Entity('provider_categories')
@Unique(['providerId', 'categoryId', 'subCategoryId'])
@Index(['providerId'])
@Index(['categoryId'])
export class ProviderCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ name: 'sub_category_id', type: 'int', nullable: true })
  subCategoryId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Provider, (provider) => provider.providerCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Category, (category) => category.providerCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(
    () => SubCategory,
    (subCategory) => subCategory.providerCategories,
    {
      onDelete: 'SET NULL',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'sub_category_id' })
  subCategory: SubCategory;

  @OneToMany(() => ProviderCategoryPhoto, (photo) => photo.providerCategory)
  photos: ProviderCategoryPhoto[];
}