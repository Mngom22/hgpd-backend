import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { IdentityDocType } from '../../common/enums';
import { ProviderPhoto } from './provider-photo.entity';
import { ProviderVideo } from './provider-video.entity';
import { ProviderCategory } from './provider-category.entity';
import { ProviderStats } from './provider-stats.entity';
import { DemandProvider } from '../../demands/entities/demand-provider.entity';
import { Review } from '../../reviews/entities/review.entity';
import { SupportRequest } from '../../support/entities/support-request.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Sponsorship } from '../../sponsorships/entities/sponsorship.entity';

@Entity('providers')
@Index(['phone'], { unique: true })
@Index(['email'])
@Index(['isActive'])
@Index(['department'])
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Informations personnelles
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'company_name', type: 'varchar', length: 200 })
  companyName: string;

  @Column({ type: 'varchar', length: 200 })
  activity: string;

  // Description courte
  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string;

  // Localisation
  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 100 })
  commune: string;

  // Contact
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  // Identité
  @Column({
    name: 'identity_doc_type',
    type: 'enum',
    enum: IdentityDocType,
  })
  identityDocType: IdentityDocType;

  @Column({ name: 'identity_doc_number', type: 'varchar', length: 50 })
  identityDocNumber: string;

  // Vérifications
  @Column({
    name: 'email_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  emailVerifiedAt: Date;

  @Column({
    name: 'phone_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  phoneVerifiedAt: Date;

  // Paramètres
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'show_phone_number', type: 'boolean', default: false })
  showPhoneNumber: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => ProviderPhoto, (photo) => photo.provider)
  photos: ProviderPhoto[];

  @OneToMany(() => ProviderVideo, (video) => video.provider)
  videos: ProviderVideo[];

  @OneToMany(() => ProviderCategory, (pc) => pc.provider)
  providerCategories: ProviderCategory[];

  @OneToOne(() => ProviderStats, (stats) => stats.provider)
  stats: ProviderStats;

  @OneToMany(() => DemandProvider, (dp) => dp.provider)
  demandProviders: DemandProvider[];

  @OneToMany(() => Review, (review) => review.provider)
  reviews: Review[];

  @OneToMany(() => SupportRequest, (request) => request.provider)
  supportRequests: SupportRequest[];

  @OneToMany(() => Payment, (payment) => payment.provider)
  payments: Payment[];

  @OneToMany(() => Subscription, (subscription) => subscription.provider)
  subscriptions: Subscription[];

  @OneToMany(() => Sponsorship, (sponsorship) => sponsorship.provider)
  sponsorships: Sponsorship[];
}
