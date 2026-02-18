import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './entities/provider.entity';
import { ProviderPhoto } from './entities/provider-photo.entity';
import { ProviderVideo } from './entities/provider-video.entity';
import { ProviderCategory } from './entities/provider-category.entity';
import { ProviderCategoryPhoto } from './entities/provider-category-photo.entity';
import { ProviderStats } from './entities/provider-stats.entity';
import { LegalModule } from '../legal/legal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderPhoto,
      ProviderVideo,
      ProviderCategory,
      ProviderCategoryPhoto,
      ProviderStats,
    ]),
    LegalModule,
  ],
  providers: [ProvidersService],
  controllers: [ProvidersController],
  exports: [ProvidersService],
})
export class ProvidersModule {}
