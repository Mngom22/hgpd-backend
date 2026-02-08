import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'sididiop',
    password: process.env.DB_PASSWORD || 'Toubakhayra',
    database: process.env.DB_DATABASE || 'hgpd_dev',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize:
      process.env.NODE_ENV === 'development' || process.env.DB_SYNC === 'true' || process.env.DB_INIT === 'true',
    // logging: process.env.NODE_ENV === 'development',
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsRun: false,
    autoLoadEntities: true,
    logging: true,

    //   // Charger toutes les entités
    // entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  }),
);
