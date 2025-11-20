-- Step 1: Add updatedAt column as nullable with default
ALTER TABLE "QCRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Update existing rows to set updatedAt = createdAt
UPDATE "QCRecord" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Step 3: Make updatedAt NOT NULL (this will work now since all rows have values)
ALTER TABLE "QCRecord" ALTER COLUMN "updatedAt" SET NOT NULL;

