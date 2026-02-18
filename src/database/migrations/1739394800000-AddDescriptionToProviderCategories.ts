import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDescriptionToProviderCategories1739394800000
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'provider_categories',
            new TableColumn({
                name: 'description',
                type: 'text',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('provider_categories', 'description');
    }
}
