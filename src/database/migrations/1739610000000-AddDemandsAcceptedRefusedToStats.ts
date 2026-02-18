import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDemandsAcceptedRefusedToStats1739610000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'provider_stats',
      new TableColumn({
        name: 'demands_accepted',
        type: 'int',
        default: 0,
      })
    );

    await queryRunner.addColumn(
      'provider_stats',
      new TableColumn({
        name: 'demands_refused',
        type: 'int',
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('provider_stats', 'demands_refused');
    await queryRunner.dropColumn('provider_stats', 'demands_accepted');
  }
}
