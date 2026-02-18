import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProviderCategory } from './provider-category.entity';

@Entity('provider_category_photos')
@Index(['providerCategoryId'])
export class ProviderCategoryPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_category_id', type: 'int' })
  providerCategoryId: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ProviderCategory, (pc) => pc.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_category_id' })
  providerCategory: ProviderCategory;
}
