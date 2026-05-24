import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletLoadRequestsTable1733373780000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists - if it does, we need to handle enum migration
        const tableExists = await queryRunner.hasTable('wallet_load_requests');
        
        if (tableExists) {
            // Table exists - need to update existing enums
            // First, convert paymentMethod column to text temporarily to allow updates
            await queryRunner.query(`
                ALTER TABLE "wallet_load_requests" 
                ALTER COLUMN "paymentMethod" TYPE text;
            `);
            
            // Update any old enum values to new ones (map ESEWA/KHALTI to MOBILE_MONEY)
            await queryRunner.query(`
                UPDATE "wallet_load_requests" 
                SET "paymentMethod" = CASE 
                    WHEN "paymentMethod" = 'ESEWA' THEN 'MOBILE_MONEY'
                    WHEN "paymentMethod" = 'KHALTI' THEN 'MOBILE_MONEY'
                    WHEN "paymentMethod" NOT IN ('BANK_TRANSFER', 'CARD', 'MOBILE_MONEY', 'OTHER') THEN 'BANK_TRANSFER'
                    ELSE "paymentMethod"
                END;
            `);
            
            // Drop old enum if it exists
            await queryRunner.query(`
                DROP TYPE IF EXISTS "public"."enum_wallet_load_requests_paymentmethod";
            `);
        }
        
        // Create or recreate PaymentMethod enum with correct values
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."enum_wallet_load_requests_paymentmethod"
                AS ENUM ('BANK_TRANSFER', 'CARD', 'MOBILE_MONEY', 'OTHER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        
        if (tableExists) {
            // Convert paymentMethod column back to enum
            await queryRunner.query(`
                ALTER TABLE "wallet_load_requests" 
                ALTER COLUMN "paymentMethod" TYPE "public"."enum_wallet_load_requests_paymentmethod" 
                USING "paymentMethod"::"public"."enum_wallet_load_requests_paymentmethod";
            `);
        }
        
        // Handle status enum - add CANCELLED if it doesn't exist
        await queryRunner.query(`
            DO $$ 
            BEGIN
                -- Check if enum exists
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_wallet_load_requests_status') THEN
                    -- Check if CANCELLED value exists
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'CANCELLED' 
                        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_wallet_load_requests_status')
                    ) THEN
                        -- Add CANCELLED to existing enum
                        ALTER TYPE "public"."enum_wallet_load_requests_status" 
                        ADD VALUE 'CANCELLED';
                    END IF;
                ELSE
                    -- Create enum with all values
                    CREATE TYPE "public"."enum_wallet_load_requests_status"
                    AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallet_load_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "walletId" uuid NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'USD',
                "paymentMethod" "public"."enum_wallet_load_requests_paymentmethod" NOT NULL DEFAULT 'BANK_TRANSFER',
                "transactionReference" character varying,
                "userNote" text,
                "proofImageUrl" character varying,
                "status" "public"."enum_wallet_load_requests_status" NOT NULL DEFAULT 'PENDING',
                "reviewedBy" uuid,
                "reviewedAt" TIMESTAMP,
                "adminRemark" text,
                "rejectionReason" text,
                "resubmissionCount" integer NOT NULL DEFAULT 0,
                "originalRequestId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_load_requests" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_load_requests_userId" ON "wallet_load_requests" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_load_requests_walletId" ON "wallet_load_requests" ("walletId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_load_requests_status" ON "wallet_load_requests" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_load_requests_createdAt" ON "wallet_load_requests" ("createdAt")`);

        await queryRunner.query(`
            ALTER TABLE "wallet_load_requests"
            ADD CONSTRAINT "FK_wallet_load_requests_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_load_requests"
            ADD CONSTRAINT "FK_wallet_load_requests_walletId"
            FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_load_requests"
            ADD CONSTRAINT "FK_wallet_load_requests_reviewedBy"
            FOREIGN KEY ("reviewedBy") REFERENCES "users"("id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_load_requests"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."enum_wallet_load_requests_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."enum_wallet_load_requests_paymentmethod"`);
    }
}
