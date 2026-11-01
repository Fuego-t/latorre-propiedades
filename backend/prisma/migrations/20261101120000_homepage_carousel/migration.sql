CREATE TABLE "HomepageSettings" (
    "id" TEXT NOT NULL DEFAULT 'homepage',
    "selection" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY ("id")
);
