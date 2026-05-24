import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserDetailTable1733373730000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_details" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "documents" jsonb, "status" character varying(50) NOT NULL DEFAULT 'PENDING', "rejectionReason" character varying, "verifiedBy" character varying, "verifiedAt" TIMESTAMP, "submittedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_details_userId" UNIQUE ("userId"), CONSTRAINT "PK_user_details" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_user_detail_userId" ON "user_details" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_detail_status" ON "user_details" ("status")`);
        await queryRunner.query(`ALTER TABLE "user_details" ADD CONSTRAINT "FK_user_details_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_details" DROP CONSTRAINT "FK_user_details_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_detail_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_detail_userId"`);
        await queryRunner.query(`DROP TABLE "user_details"`);
    }

}