import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
  Unique,
} from 'typeorm';
import { DemandStatus, NonConversionReason } from '../../common/enums';
import { Demand } from './demand.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('demand_providers')
@Unique(['demandId', 'providerId'])
@Index(['demandId'])
@Index(['providerId'])
@Index(['status'])
@Index(['convertedToMission'])
export class DemandProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'demand_id', type: 'uuid' })
  demandId: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  leadPrice: number;

  // Statut spécifique
  @Column({
    type: 'enum',
    enum: DemandStatus,
    default: DemandStatus.NEW_REQUEST,
  })
  status: DemandStatus;

  // Réponse du prestataire
  @Column({ name: 'provider_response', type: 'text', nullable: true })
  providerResponse: string;

  // Conversion tracking
  @Column({ name: 'converted_to_mission', type: 'boolean', default: false })
  convertedToMission: boolean;

  @Column({
    name: 'non_conversion_reason',
    type: 'enum',
    enum: NonConversionReason,
    nullable: true,
  })
  nonConversionReason: NonConversionReason;

  @Column({ name: 'non_conversion_comment', type: 'text', nullable: true })
  nonConversionComment: string;

  // Déblocage contact
  @Column({
    name: 'contact_unlocked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  contactUnlockedAt: Date;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string;

  // Admin approval
  @Column({
    name: 'admin_approved_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  adminApprovedAt: Date;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Demand, (demand) => demand.demandProviders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'demand_id' })
  demand: Demand;

  @ManyToOne(() => Provider, (provider) => provider.demandProviders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @OneToOne(() => Review, (review) => review.demandProvider)
  review: Review;
}
