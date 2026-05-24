"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAdminNotificationsTable1733373800000 = void 0;
class CreateAdminNotificationsTable1733373800000 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "admin_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "relatedEntityId" character varying NOT NULL, "message" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "readBy" character varying, "readAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_admin_notifications" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "admin_notifications"`);
    }
}
exports.CreateAdminNotificationsTable1733373800000 = CreateAdminNotificationsTable1733373800000;
