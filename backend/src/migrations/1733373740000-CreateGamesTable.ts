import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGamesTable1733373740000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable("games");
        if (hasTable) return;

        await queryRunner.query(`
            CREATE TABLE "games" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "gameType" character varying(50) NOT NULL,
                "tableId" character varying NOT NULL,
                "roomType" character varying(50) NOT NULL,
                "bootAmount" numeric(10,2) NOT NULL,
                "maxPlayers" integer NOT NULL,
                "currentPlayers" jsonb NOT NULL,
                "gameState" jsonb NOT NULL,
                "result" jsonb,
                "startedAt" TIMESTAMP,
                "endedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_games_tableId" UNIQUE ("tableId"),
                CONSTRAINT "PK_games" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_games_gameType" ON "games" ("gameType")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_games_tableId" ON "games" ("tableId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_games_roomType" ON "games" ("roomType")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_games_createdAt" ON "games" ("createdAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "games"`);
    }
}
