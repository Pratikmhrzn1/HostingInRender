import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGameHistoryTable1733373750000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable("game_history");
        if (hasTable) return;

        await queryRunner.query(`
            CREATE TABLE "game_history" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "gameId" uuid NOT NULL,
                "gameType" character varying(50) NOT NULL,
                "players" jsonb NOT NULL,
                "pot" numeric(10,2) NOT NULL,
                "rake" numeric(10,2) NOT NULL,
                "winner" character varying NOT NULL,
                "actions" jsonb NOT NULL,
                "startedAt" TIMESTAMP NOT NULL,
                "endedAt" TIMESTAMP NOT NULL,
                "duration" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_game_history_gameId" UNIQUE ("gameId"),
                CONSTRAINT "PK_game_history" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_history_gameId" ON "game_history" ("gameId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_history_gameType" ON "game_history" ("gameType")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_history_winner" ON "game_history" ("winner")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_history_createdAt" ON "game_history" ("createdAt")`);

        // FK may already exist in dirty states
        try {
            await queryRunner.query(`
                ALTER TABLE "game_history"
                ADD CONSTRAINT "FK_game_history_gameId"
                FOREIGN KEY ("gameId")
                REFERENCES "games"("id")
                ON DELETE NO ACTION
                ON UPDATE NO ACTION
            `);
        } catch (e) {
            console.warn('Could not add foreign key constraint for game_history.gameId:', e instanceof Error ? e.message : e);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "game_history"`);
    }
}
