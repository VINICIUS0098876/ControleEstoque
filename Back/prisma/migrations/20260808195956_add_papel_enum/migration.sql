-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'FUNCIONARIO');

-- AlterTable
-- Converte a coluna existente para o enum preservando os valores atuais (em vez de
-- DROP + ADD, que é o que `prisma migrate diff` geraria por padrão: isso apagaria o
-- papel de todo mundo e recriaria a coluna com o default ADMIN, promovendo qualquer
-- FUNCIONARIO existente a ADMIN).
ALTER TABLE "Usuario" ALTER COLUMN "papel" DROP DEFAULT;
ALTER TABLE "Usuario" ALTER COLUMN "papel" TYPE "Papel" USING ("papel"::"Papel");
ALTER TABLE "Usuario" ALTER COLUMN "papel" SET DEFAULT 'ADMIN';
