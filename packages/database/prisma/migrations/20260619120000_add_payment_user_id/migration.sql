-- Delete orphan payments that cannot be attributed to a user
DELETE FROM "Payment";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
