/*
  Warnings:

  - Added the required column `updatedAt` to the `DecisionRoom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DecisionRoom" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
ALTER TABLE "DecisionRoom" ALTER COLUMN "updatedAt" DROP DEFAULT;
