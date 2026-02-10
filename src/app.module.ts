import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as crypto from 'crypto';

// Make crypto globally available
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto as any;
}

// Import des configs
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import waveConfig from './config/wave.config';
import whatsappConfig from './config/whatsapp.config';
import emailConfig from './config/email.config';

// Import des modules métier
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { EventsModule } from './events/events.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';

import { validate } from './config/env.validation';
import { OrganizersModule } from './organizers/organizers.module';
import { CategoriesModule } from './categories/categories.module';
import { DemandsModule } from './demands/demands.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportModule } from './support/support.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SponsorshipsModule } from './sponsorships/sponsorships.module';
import { LegalModule } from './legal/legal.module';
import { UploadsModule } from './uploads/uploads.module';
import { AdminModule } from './admin/admin.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      load: [
        databaseConfig,
        jwtConfig,
        waveConfig,
        whatsappConfig,
        emailConfig,
      ],
      validate,
    }),

    // Base de données - VERSION CORRIGÉE
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
      },
    ]),

    // Modules métier
    AuthModule,
    UsersModule,
    ProvidersModule,
    EventsModule,
    PaymentsModule,
    NotificationsModule,
    OrganizersModule,
    CategoriesModule,
    DemandsModule,
    ReviewsModule,
    SupportModule,
    SubscriptionsModule,
    SponsorshipsModule,
    LegalModule,
    UploadsModule,
    AdminModule,
    ContactModule,
  ],
})
export class AppModule {}
