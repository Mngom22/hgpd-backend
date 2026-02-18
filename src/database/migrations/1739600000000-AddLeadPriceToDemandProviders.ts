import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLeadPriceToDemandProviders1739600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'demand_providers',
      new TableColumn({
        name: 'lead_price',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
        default: null,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('demand_providers', 'lead_price');
  }
}
