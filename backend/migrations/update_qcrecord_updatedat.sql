-- Update existing QCRecord rows to set updatedAt = createdAt
UPDATE "QCRecord" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

