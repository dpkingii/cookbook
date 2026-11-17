-- CreateTable
CREATE TABLE "session_photos" (
    "session_id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_photos_pkey" PRIMARY KEY ("session_id")
);

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cooking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
