-- DropIndex
DROP INDEX "session_events_session_id_at_idx";

-- AlterTable
ALTER TABLE "cooking_sessions" ADD COLUMN     "plausible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "session_events" ADD COLUMN     "seq" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "session_events_session_id_at_seq_idx" ON "session_events"("session_id", "at", "seq");
