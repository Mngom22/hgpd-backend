import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProviderCategoryRelationshipColumns1738886400002
  implements MigrationInterface
{
  name = 'AddProviderCategoryRelationshipColumns1738886400002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if categories table exists and add relationship columns if needed
    const categoriesTable = await queryRunner.getTable('categories');
    if (categoriesTable) {
      // The categories table should be fine, but let's ensure the column is named correctly
      const hasIsActiveColumn = categoriesTable.columns.some(
        (col) => col.name === 'is_active' || col.name === 'isActive',
      );

      if (!hasIsActiveColumn) {
        await queryRunner.addColumn(
          'categories',
          new TableColumn({
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          }),
        );
      }
    }

    // Check if sub_categories table exists and has proper columns
    const subCategoriesTable = await queryRunner.getTable('sub_categories');
    if (subCategoriesTable) {
      const hasIsActiveColumn = subCategoriesTable.columns.some(
        (col) => col.name === 'is_active' || col.name === 'isActive',
      );

      if (!hasIsActiveColumn) {
        await queryRunner.addColumn(
          'sub_categories',
          new TableColumn({
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          }),
        );
      }

      const hasIsDefaultColumn = subCategoriesTable.columns.some(
        (col) => col.name === 'is_default' || col.name === 'isDefault',
      );

      if (!hasIsDefaultColumn) {
        await queryRunner.addColumn(
          'sub_categories',
          new TableColumn({
            name: 'is_default',
            type: 'boolean',
            default: false,
            isNullable: false,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const categoriesTable = await queryRunner.getTable('categories');
    if (categoriesTable) {
      const hasIsActiveColumn = categoriesTable.columns.some(
        (col) => col.name === 'is_active',
      );

      if (hasIsActiveColumn) {
        await queryRunner.dropColumn('categories', 'is_active');
      }
    }

    const subCategoriesTable = await queryRunner.getTable('sub_categories');
    if (subCategoriesTable) {
      const hasIsActiveColumn = subCategoriesTable.columns.some(
        (col) => col.name === 'is_active',
      );

      if (hasIsActiveColumn) {
        await queryRunner.dropColumn('sub_categories', 'is_active');
      }

      const hasIsDefaultColumn = subCategoriesTable.columns.some(
        (col) => col.name === 'is_default',
      );

      if (hasIsDefaultColumn) {
        await queryRunner.dropColumn('sub_categories', 'is_default');
      }
    }
  }
}
