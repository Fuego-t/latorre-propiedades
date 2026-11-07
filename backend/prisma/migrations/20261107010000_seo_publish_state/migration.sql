CREATE TABLE "SeoPublishState" (
    "id" TEXT NOT NULL DEFAULT 'seo',
    "requestedRevision" INTEGER NOT NULL DEFAULT 0,
    "publishedRevision" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeoPublishState_pkey" PRIMARY KEY ("id")
);
