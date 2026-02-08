import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

// Entities
import { User } from '../../users/entities/users.entities';
import { Category } from '../../categories/entities/category.entity';
import { SubCategory } from '../../categories/entities/sub-category.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ProviderCategory } from '../../providers/entities/provider-category.entity';
import { ProviderStats } from '../../providers/entities/provider-stats.entity';
import { Organizer } from '../../organizers/entities/organizer.entity';
import { LegalDocument, LegalDocumentType } from '../../legal/entities/legal-document.entity';

// Data
import { categoriesData } from './data/categories.data';
import { usersData } from './data/users.data';
import { generateProviders } from './data/providers.data';
import { generateOrganizers } from './data/organizers.data';
import { legalTermsData } from './data/legal-terms.data';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(ProviderCategory)
    private readonly providerCategoryRepository: Repository<ProviderCategory>,
    @InjectRepository(ProviderStats)
    private readonly providerStatsRepository: Repository<ProviderStats>,
    @InjectRepository(Organizer)
    private readonly organizerRepository: Repository<Organizer>,
    @InjectRepository(LegalDocument)
    private readonly legalDocumentRepository: Repository<LegalDocument>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      await this.seedLegalTerms();
      await this.seedUsers();
      await this.seedCategories();
      await this.seedProviders();
      await this.seedOrganizers();

      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    this.logger.log('Clearing database...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let replicationRoleSet = false;

    try {
      // Tenter de désactiver les contraintes de clés étrangères temporairement.
      // Sur les environnements sans droits superuser, cela peut échouer — nous
      // continuerons dans ce cas en utilisant TRUNCATE ... CASCADE.
      try {
        await queryRunner.query('SET session_replication_role = replica;');
        replicationRoleSet = true;
      } catch (e) {
        this.logger.warn(
          'Could not set session_replication_role to replica — proceeding without disabling foreign key checks: ' +
            e.message,
        );
      }

      // Ordre de suppression pour respecter les dépendances
      const tables = [
        'notifications',
        'sponsorships',
        'subscriptions',
        'payments',
        'support_requests',
        'reviews',
        'demand_providers',
        'demands',
        'provider_stats',
        'provider_categories',
        'provider_videos',
        'provider_photos',
        'providers',
        'organizers',
        'sub_categories',
        'categories',
        'users',
      ];

      for (const table of tables) {
        try {
          await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE;`);
          this.logger.log(`Cleared table: ${table}`);
        } catch (e) {
          this.logger.warn(`Could not clear table ${table}: ${e.message}`);
        }
      }

      // Réactiver les contraintes uniquement si nous avions réussi à les désactiver
      if (replicationRoleSet) {
        try {
          await queryRunner.query('SET session_replication_role = DEFAULT;');
        } catch (e) {
          this.logger.warn(
            'Could not reset session_replication_role: ' + e.message,
          );
        }
      }

      this.logger.log('Database cleared successfully!');
    } finally {
      await queryRunner.release();
    }
  }

  private async seedUsers(): Promise<void> {
    this.logger.log('Seeding users...');

    const existingCount = await this.userRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Users already seeded (${existingCount} found). Skipping...`,
      );
      return;
    }

    for (const userData of usersData) {
      const user = this.userRepository.create(userData);
      await this.userRepository.save(user);
    }

    this.logger.log(`Seeded ${usersData.length} users`);
  }

  private async seedLegalTerms(): Promise<void> {
    this.logger.log('Seeding legal documents...');

    const existingCount = await this.legalDocumentRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Legal documents already seeded (${existingCount} found). Skipping...`,
      );
      return;
    }

    for (const termData of legalTermsData) {
      const legalDoc = this.legalDocumentRepository.create({
        type: termData.type as LegalDocumentType,
        title: `${termData.type} - Version ${termData.version}`,
        content: termData.content,
        version: termData.version,
        isActive: termData.active,
        publishedAt: new Date(),
      });
      await this.legalDocumentRepository.save(legalDoc);
    }

    this.logger.log(`Seeded ${legalTermsData.length} legal documents`);
  }

  private async seedCategories(): Promise<void> {
    this.logger.log('Seeding categories and subcategories...');

    const existingCount = await this.categoryRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Categories already seeded (${existingCount} found). Skipping...`,
      );
      return;
    }

    for (const categoryData of categoriesData) {
      const { subCategories, ...categoryFields } = categoryData;

      // Créer la catégorie
      const category = this.categoryRepository.create(categoryFields);
      const savedCategory = await this.categoryRepository.save(category);

      // Créer les sous-catégories
      for (const subCategoryData of subCategories) {
        const subCategory = this.subCategoryRepository.create({
          ...subCategoryData,
          categoryId: savedCategory.id,
        });
        await this.subCategoryRepository.save(subCategory);
      }
    }

    const totalSubCategories = await this.subCategoryRepository.count();
    this.logger.log(
      `Seeded ${categoriesData.length} categories and ${totalSubCategories} subcategories`,
    );
  }

  private async seedProviders(): Promise<void> {
    this.logger.log('Seeding providers...');

    const existingCount = await this.providerRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Providers already seeded (${existingCount} found). Skipping...`,
      );
      return;
    }

    const providersData = generateProviders(50);

    // Récupérer toutes les catégories et sous-catégories
    const categories = await this.categoryRepository.find();
    const subCategories = await this.subCategoryRepository.find();

    const categoryMap = new Map(categories.map((c) => [c.slug, c]));
    const subCategoryMap = new Map(subCategories.map((sc) => [sc.slug, sc]));

    for (const providerData of providersData) {
      const { categorySlug, subCategorySlug, ...providerFields } = providerData;

      // Créer le provider
      const provider = this.providerRepository.create(providerFields);
      const savedProvider = await this.providerRepository.save(provider);

      // Associer à la catégorie
      const category = categoryMap.get(categorySlug);
      const subCategory = subCategoryMap.get(subCategorySlug);

      if (category) {
        const providerCategory = this.providerCategoryRepository.create({
          providerId: savedProvider.id,
          categoryId: category.id,
          subCategoryId: subCategory?.id,
        });
        await this.providerCategoryRepository.save(providerCategory);
      }

      // Créer les stats du provider
      const stats = this.providerStatsRepository.create({
        providerId: savedProvider.id,
        demandsReceived: Math.floor(Math.random() * 50),
        missionsCompleted: Math.floor(Math.random() * 30),
        completionRate: Number((50 + Math.random() * 50).toFixed(2)),
        revenueGenerated: Math.floor(Math.random() * 5000000),
        profileViews: Math.floor(Math.random() * 500),
      });
      await this.providerStatsRepository.save(stats);
    }

    this.logger.log(
      `Seeded ${providersData.length} providers with categories and stats`,
    );
  }

  private async seedOrganizers(): Promise<void> {
    this.logger.log('Seeding organizers...');

    const existingCount = await this.organizerRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Organizers already seeded (${existingCount} found). Skipping...`,
      );
      return;
    }

    const organizersData = generateOrganizers(30);

    for (const organizerData of organizersData) {
      const organizer = this.organizerRepository.create(organizerData);
      await this.organizerRepository.save(organizer);
    }

    this.logger.log(`Seeded ${organizersData.length} organizers`);
  }
}
