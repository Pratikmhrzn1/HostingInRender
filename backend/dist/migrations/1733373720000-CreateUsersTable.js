"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUsersTable1733373720000 = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@/types");
class CreateUsersTable1733373720000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()",
                },
                {
                    name: "phone",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "email",
                    type: "varchar",
                    isUnique: true,
                },
                {
                    name: "name",
                    type: "varchar",
                },
                {
                    name: "password",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "avatar",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "isVerified",
                    type: "boolean",
                    default: false,
                },
                {
                    name: "isUserDetailVerified",
                    type: "boolean",
                    default: false,
                },
                {
                    name: "deviceInfo",
                    type: "jsonb",
                    isNullable: true,
                },
                {
                    name: "status",
                    type: "varchar",
                    length: "50",
                    default: `'${types_1.UserStatus.ACTIVE}'`,
                },
                {
                    name: "role",
                    type: "varchar",
                    length: "20",
                    default: "'USER'",
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }));
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "users" ("status")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }
}
exports.CreateUsersTable1733373720000 = CreateUsersTable1733373720000;
