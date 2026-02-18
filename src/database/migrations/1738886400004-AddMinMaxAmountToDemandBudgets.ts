import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinMaxAmountToDemandBudgets1738886400004
  implements MigrationInterface
{
  name = 'AddMinMaxAmountToDemandBudgets1738886400004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter min_amount avec une valeur par défaut temporaire (copie de amount)
    await queryRunner.query(`
      ALTER TABLE "demand_budgets"
      ADD COLUMN "min_amount" decimal(12,2) NOT NULL DEFAULT 0
    `);

    // Ajouter max_amount avec une valeur par défaut temporaire (copie de amount)
    await queryRunner.query(`
      ALTER TABLE "demand_budgets"
      ADD COLUMN "max_amount" decimal(12,2) NOT NULL DEFAULT 0
    `);

    // Copier les valeurs existantes de amount vers min_amount et max_amount
    await queryRunner.query(`
      UPDATE "demand_budgets"
      SET "min_amount" = "amount", "max_amount" = "amount"
    `);

    // Supprimer la colonne amount
    await queryRunner.query(`
      ALTER TABLE "demand_budgets" DROP COLUMN "amount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Réajouter la colonne amount
    await queryRunner.query(`
      ALTER TABLE "demand_budgets"
      ADD COLUMN "amount" decimal(12,2) NOT NULL DEFAULT 0
    `);

    // Copier max_amount vers amount
    await queryRunner.query(`
      UPDATE "demand_budgets" SET "amount" = "max_amount"
    `);

    // Supprimer min_amount et max_amount
    await queryRunner.query(`
      ALTER TABLE "demand_budgets" DROP COLUMN "min_amount"
    `);
    await queryRunner.query(`
      ALTER TABLE "demand_budgets" DROP COLUMN "max_amount"
    `);
  }
}
