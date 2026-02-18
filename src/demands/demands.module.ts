import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandsService } from './demands.service';
import { DemandsController } from './demands.controller';
import { Demand } from './entities/demand.entity';
import { DemandProvider } from './entities/demand-provider.entity';
import { DemandBudget } from './entities/demand-budget.entity';
import { Provider } from '../providers/entities/provider.entity';
import { ProviderCategory } from '../providers/entities/provider-category.entity';
import { Organizer } from '../organizers/entities/organizer.entity';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { ProvidersModule } from '../providers/providers.module';

import { Admin } from '../auth/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Demand,
      DemandProvider,
      DemandBudget,
      Provider,
      ProviderCategory,
      Organizer,
      Admin,
    ]),
    MailModule,
    WhatsAppModule,
    NotificationsModule,
    EventsModule,
    ProvidersModule,
  ],
  providers: [DemandsService],
  controllers: [DemandsController],
  exports: [DemandsService],
})
export class DemandsModule { }
