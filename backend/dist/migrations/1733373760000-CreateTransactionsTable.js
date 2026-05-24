"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTransactionsTable1733373760000 = void 0;
class CreateTransactionsTable1733373760000 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" character varying(50) NOT NULL, "category" character varying(50) NOT NULL, "amount" numeric(10,2) NOT NULL, "balanceBefore" numeric(10,2), "balanceAfter" numeric(10,2), "status" character varying(50) NOT NULL DEFAULT 'PENDING', "paymentMethod" character varying, "paymentGatewayId" character varying, "description" character varying, "gameId" uuid, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_transactions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_type" ON "transactions" ("type")`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_category" ON "transactions" ("category")`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_createdAt" ON "transactions" ("createdAt")`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_gameId" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_gameId"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transactions_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transactions_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transactions_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transactions_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_transactions_userId"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
    }
}
exports.CreateTransactionsTable1733373760000 = CreateTransactionsTable1733373760000;
