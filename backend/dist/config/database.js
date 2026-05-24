"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceOptions = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
// ✅ Import all entities directly instead of glob path
const User_entity_1 = require("@/models/User.entity");
const Wallet_entity_1 = require("@/models/Wallet.entity");
const Transaction_entity_1 = require("@/models/Transaction.entity");
const Game_entity_1 = require("@/models/Game.entity");
const GameHistory_entity_1 = require("@/models/GameHistory.entity");
const UserDetail_entity_1 = require("@/models/UserDetail.entity");
const WalletLoadRequest_entity_1 = require("@/models/WalletLoadRequest.entity");
const WalletTransaction_entity_1 = require("@/models/WalletTransaction.entity");
const KYC_entity_1 = require("@/models/KYC.entity");
(0, dotenv_1.config)();
const getDataSourceOptions = () => {
    const baseOptions = {
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.DB_LOGGING === 'true',
        entities: [
            User_entity_1.User,
            Wallet_entity_1.Wallet,
            Transaction_entity_1.Transaction,
            Game_entity_1.Game,
            GameHistory_entity_1.GameHistory,
            UserDetail_entity_1.UserDetail,
            WalletLoadRequest_entity_1.WalletLoadRequest,
            WalletTransaction_entity_1.WalletTransaction,
            KYC_entity_1.KYC
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
        };
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
    };
};
exports.dataSourceOptions = getDataSourceOptions();
const dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
exports.default = dataSource;
