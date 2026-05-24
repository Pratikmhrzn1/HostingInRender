import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// ✅ Import all entities directly instead of glob path
import { User } from '@/models/User.entity';
import { Wallet } from '@/models/Wallet.entity';
import { Transaction } from '@/models/Transaction.entity';
import { Game } from '@/models/Game.entity';
import { GameHistory } from '@/models/GameHistory.entity';
import { UserDetail } from '@/models/UserDetail.entity';
import { WalletLoadRequest } from '@/models/WalletLoadRequest.entity';
import { WalletTransaction } from '@/models/WalletTransaction.entity';
import { KYC } from '@/models/KYC.entity';
config();

const getDataSourceOptions = (): DataSourceOptions => {
  const baseOptions: Partial<DataSourceOptions> = {
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',

    entities: [
      User,
      Wallet,
      Transaction,
      Game,
      GameHistory,
      UserDetail,
      WalletLoadRequest,
      WalletTransaction,
      KYC
    ],

    migrations: [__dirname + '/../migrations/*.{ts,js}'],
    subscribers: [__dirname + '/../subscribers/*.{ts,js}'],
  };

  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      ...baseOptions,
    } as DataSourceOptions;
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'game_platform',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    ...baseOptions,
  } as DataSourceOptions;
};

export const dataSourceOptions: DataSourceOptions = getDataSourceOptions();

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;