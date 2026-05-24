"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWalletsTable1733373770000 = void 0;
class CreateWalletsTable1733373770000 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "balance" numeric(10,2) NOT NULL DEFAULT '0', "bonusBalance" numeric(10,2) NOT NULL DEFAULT '0', "lockedAmount" numeric(10,2) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'USD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_wallets_userId" UNIQUE ("userId"), CONSTRAINT "PK_wallets" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_wallets_userId" ON "wallets" ("userId")`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_wallets_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_wallets_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_wallets_userId"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
    }
}
exports.CreateWalletsTable1733373770000 = CreateWalletsTable1733373770000;
