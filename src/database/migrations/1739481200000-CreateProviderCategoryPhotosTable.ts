import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProviderCategoryPhotosTable1739481200000
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'provider_category_photos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider_category_id',
            type: 'int',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'display_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['provider_category_id'],
            referencedTableName: 'provider_categories',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create index for faster queries by provider_category_id
    await queryRunner.createIndex(
      'provider_category_photos',
      new TableIndex({
        columnNames: ['provider_category_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('provider_category_photos', true);
  }
}
