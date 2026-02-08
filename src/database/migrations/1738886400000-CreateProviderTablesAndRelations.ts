import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateProviderTablesAndRelations1738886400000
  implements MigrationInterface
{
  name = 'CreateProviderTablesAndRelations1738886400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create provider_photos table
    const hasProviderPhotosTable = await queryRunner.hasTable('provider_photos');
    if (!hasProviderPhotosTable) {
      await queryRunner.createTable(
        new Table({
          name: 'provider_photos',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'provider_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'url',
              type: 'varchar',
              length: '500',
              isNullable: false,
            },
            {
              name: 'is_main',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'display_order',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'photo_type',
              type: 'enum',
              enum: ['profile', 'service'],
              default: "'service'",
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add index for provider_id
      await queryRunner.createIndex(
        'provider_photos',
        new TableIndex({
          name: 'IDX_provider_photos_provider_id',
          columnNames: ['provider_id'],
        }),
      );

      // Add unique index for is_main
      await queryRunner.createIndex(
        'provider_photos',
        new TableIndex({
          name: 'IDX_provider_photos_provider_id_is_main',
          columnNames: ['provider_id', 'is_main'],
          isUnique: true,
        }),
      );

      // Add foreign key
      await queryRunner.createForeignKey(
        'provider_photos',
        new TableForeignKey({
          columnNames: ['provider_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'providers',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create provider_videos table
    const hasProviderVideosTable = await queryRunner.hasTable(
      'provider_videos',
    );
    if (!hasProviderVideosTable) {
      await queryRunner.createTable(
        new Table({
          name: 'provider_videos',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'provider_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'url',
              type: 'varchar',
              length: '500',
              isNullable: false,
            },
            {
              name: 'display_order',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add index for provider_id
      await queryRunner.createIndex(
        'provider_videos',
        new TableIndex({
          name: 'IDX_provider_videos_provider_id',
          columnNames: ['provider_id'],
        }),
      );

      // Add foreign key
      await queryRunner.createForeignKey(
        'provider_videos',
        new TableForeignKey({
          columnNames: ['provider_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'providers',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create provider_categories table with proper constraint
    const hasProviderCategoriesTable = await queryRunner.hasTable(
      'provider_categories',
    );
    if (!hasProviderCategoriesTable) {
      await queryRunner.createTable(
        new Table({
          name: 'provider_categories',
          columns: [
            {
              name: 'id',
              type: 'serial',
              isPrimary: true,
            },
            {
              name: 'provider_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'category_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'sub_category_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'illustrative_photo_url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add indexes
      await queryRunner.createIndex(
        'provider_categories',
        new TableIndex({
          name: 'IDX_provider_categories_provider_id',
          columnNames: ['provider_id'],
        }),
      );

      await queryRunner.createIndex(
        'provider_categories',
        new TableIndex({
          name: 'IDX_provider_categories_category_id',
          columnNames: ['category_id'],
        }),
      );

      // Add unique constraint
      await queryRunner.createUniqueConstraint(
        'provider_categories',
        new TableUnique({
          columnNames: ['provider_id', 'category_id', 'sub_category_id'],
          name: 'UQ_provider_categories_unique',
        }),
      );

      // Add foreign keys
      await queryRunner.createForeignKey(
        'provider_categories',
        new TableForeignKey({
          columnNames: ['provider_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'providers',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'provider_categories',
        new TableForeignKey({
          columnNames: ['category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'categories',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'provider_categories',
        new TableForeignKey({
          columnNames: ['sub_category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'sub_categories',
          onDelete: 'SET NULL',
        }),
      );
    }

    // Create provider_stats table
    const hasProviderStatsTable = await queryRunner.hasTable('provider_stats');
    if (!hasProviderStatsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'provider_stats',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'provider_id',
              type: 'uuid',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'demands_received',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'missions_completed',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'completion_rate',
              type: 'numeric',
              precision: 5,
              scale: 2,
              default: 0,
              isNullable: false,
            },
            {
              name: 'revenue_generated',
              type: 'numeric',
              precision: 12,
              scale: 2,
              default: 0,
              isNullable: false,
            },
            {
              name: 'profile_views',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'last_updated',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add index for provider_id
      await queryRunner.createIndex(
        'provider_stats',
        new TableIndex({
          name: 'IDX_provider_stats_provider_id',
          columnNames: ['provider_id'],
          isUnique: true,
        }),
      );

      // Add foreign key
      await queryRunner.createForeignKey(
        'provider_stats',
        new TableForeignKey({
          columnNames: ['provider_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'providers',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasProviderPhotosTable = await queryRunner.hasTable('provider_photos');
    const hasProviderVideosTable = await queryRunner.hasTable(
      'provider_videos',
    );
    const hasProviderCategoriesTable = await queryRunner.hasTable(
      'provider_categories',
    );
    const hasProviderStatsTable = await queryRunner.hasTable('provider_stats');

    if (hasProviderPhotosTable) {
      await queryRunner.dropTable('provider_photos');
    }

    if (hasProviderVideosTable) {
      await queryRunner.dropTable('provider_videos');
    }

    if (hasProviderCategoriesTable) {
      await queryRunner.dropTable('provider_categories');
    }

    if (hasProviderStatsTable) {
      await queryRunner.dropTable('provider_stats');
    }
  }
}
