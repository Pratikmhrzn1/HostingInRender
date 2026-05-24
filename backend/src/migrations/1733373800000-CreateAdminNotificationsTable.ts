import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminNotificationsTable1733373800000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "admin_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "relatedEntityId" character varying NOT NULL, "message" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "readBy" character varying, "readAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_admin_notifications" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admin_notifications"`);
    }

}