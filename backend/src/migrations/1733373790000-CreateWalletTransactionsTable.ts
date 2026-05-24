import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletTransactionsTable1733373790000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // create enums first (idempotent)
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."enum_wallet_transactions_type"
                AS ENUM ('CREDIT', 'DEBIT');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."enum_wallet_transactions_source"
                AS ENUM ('GAME', 'WALLET_LOAD', 'WITHDRAWAL', 'BONUS');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallet_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "walletId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "type" "public"."enum_wallet_transactions_type" NOT NULL,
                "source" "public"."enum_wallet_transactions_source" NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "balanceBefore" numeric(10,2) NOT NULL,
                "balanceAfter" numeric(10,2) NOT NULL,
                "loadRequestId" uuid,
                "description" text,
                "metadata" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_walletId" ON "wallet_transactions" ("walletId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_userId" ON "wallet_transactions" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_walletId_createdAt" ON "wallet_transactions" ("walletId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_userId_createdAt" ON "wallet_transactions" ("userId", "createdAt")`);

        await queryRunner.query(`
            ALTER TABLE "wallet_transactions"
            ADD CONSTRAINT "FK_wallet_transactions_walletId"
            FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_transactions"
            ADD CONSTRAINT "FK_wallet_transactions_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_transactions"
            ADD CONSTRAINT "FK_wallet_transactions_loadRequestId"
            FOREIGN KEY ("loadRequestId") REFERENCES "wallet_load_requests"("id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."enum_wallet_transactions_source"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."enum_wallet_transactions_type"`);
    }
}
