import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProvidersTableIfNotExists1738886400001
  implements MigrationInterface
{
  name = 'CreateProvidersTableIfNotExists1738886400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create providers table if it doesn't exist
    const hasProvidersTable = await queryRunner.hasTable('providers');
    if (!hasProvidersTable) {
      await queryRunner.createTable(
        new Table({
          name: 'providers',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'first_name',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'last_name',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'company_name',
              type: 'varchar',
              length: '200',
              isNullable: false,
            },
            {
              name: 'activity',
              type: 'varchar',
              length: '200',
              isNullable: false,
            },
            {
              name: 'short_description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'department',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'commune',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'phone',
              type: 'varchar',
              length: '20',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'password',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'identity_doc_type',
              type: 'enum',
              enum: ['PASSPORT', 'NATIONAL_ID', 'DRIVER_LICENSE'],
              isNullable: false,
            },
            {
              name: 'identity_doc_number',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'email_verified_at',
              type: 'timestamp with time zone',
              isNullable: true,
            },
            {
              name: 'phone_verified_at',
              type: 'timestamp with time zone',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
              isNullable: false,
            },
            {
              name: 'show_phone_number',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'is_paid',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
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
        'providers',
        new TableIndex({
          name: 'IDX_providers_phone',
          columnNames: ['phone'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'providers',
        new TableIndex({
          name: 'IDX_providers_email',
          columnNames: ['email'],
        }),
      );

      await queryRunner.createIndex(
        'providers',
        new TableIndex({
          name: 'IDX_providers_is_active',
          columnNames: ['is_active'],
        }),
      );

      await queryRunner.createIndex(
        'providers',
        new TableIndex({
          name: 'IDX_providers_department',
          columnNames: ['department'],
        }),
      );
    } else {
      // Table exists, check if short_description column exists
      const table = await queryRunner.getTable('providers');
      const hasShortDescriptionColumn = table?.columns.some(
        (col) => col.name === 'short_description',
      );

      if (!hasShortDescriptionColumn) {
        const { TableColumn } = await import('typeorm');
        await queryRunner.addColumn(
          'providers',
          new TableColumn({
            name: 'short_description',
            type: 'text',
            isNullable: true,
          }),
        );
      }

      // Check and add is_paid column if missing
      const hasIsPaidColumn = table?.columns.some(
        (col) => col.name === 'is_paid',
      );

      if (!hasIsPaidColumn) {
        const { TableColumn } = await import('typeorm');
        await queryRunner.addColumn(
          'providers',
          new TableColumn({
            name: 'is_paid',
            type: 'boolean',
            default: false,
            isNullable: false,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasProvidersTable = await queryRunner.hasTable('providers');
    if (hasProvidersTable) {
      await queryRunner.dropTable('providers');
    }
  }
}
