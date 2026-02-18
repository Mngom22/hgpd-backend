import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('provider_stats')
@Index(['providerId'], { unique: true })
export class ProviderStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid', unique: true })
  providerId: string;

  @Column({ name: 'demands_received', type: 'int', default: 0 })
  demandsReceived: number;

  @Column({ name: 'demands_accepted', type: 'int', default: 0 })
  demandsAccepted: number;

  @Column({ name: 'demands_refused', type: 'int', default: 0 })
  demandsRefused: number;

  @Column({ name: 'missions_completed', type: 'int', default: 0 })
  missionsCompleted: number;

  @Column({
    name: 'completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionRate: number;

  @Column({
    name: 'revenue_generated',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  revenueGenerated: number;

  @Column({ name: 'profile_views', type: 'int', default: 0 })
  profileViews: number;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp with time zone' })
  lastUpdated: Date;

  // Relations
  @OneToOne(() => Provider, (provider) => provider.stats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
}
