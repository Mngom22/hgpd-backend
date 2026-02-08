import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeederService } from './seeder.service';

// Entities
import { User } from '../../users/entities/users.entities';
import { Category } from '../../categories/entities/category.entity';
import { SubCategory } from '../../categories/entities/sub-category.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ProviderCategory } from '../../providers/entities/provider-category.entity';
import { ProviderStats } from '../../providers/entities/provider-stats.entity';
import { Organizer } from '../../organizers/entities/organizer.entity';
import { LegalDocument } from '../../legal/entities/legal-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      SubCategory,
      Provider,
      ProviderCategory,
      ProviderStats,
      Organizer,
      LegalDocument,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
