-- AlterEnum
ALTER TYPE "PrazoStatus" RENAME VALUE 'NoPrazo' TO 'NO_PRAZO';
ALTER TYPE "PrazoStatus" RENAME VALUE 'Atrasado' TO 'ATRASADO';
ALTER TYPE "PrazoStatus" RENAME VALUE 'Concluido' TO 'CONCLUIDO';

-- AlterTable
ALTER TABLE "RelatorioQuinzenal"
  ALTER COLUMN "execFisicaPct" SET DEFAULT 0,
  ALTER COLUMN "execFinanceiraPct" SET DEFAULT 0;

UPDATE "RelatorioQuinzenal"
SET "execFisicaPct" = COALESCE("execFisicaPct", 0),
    "execFinanceiraPct" = COALESCE("execFinanceiraPct", 0)
WHERE "execFisicaPct" IS NULL
   OR "execFinanceiraPct" IS NULL;

ALTER TABLE "RelatorioQuinzenal"
  ALTER COLUMN "execFisicaPct" DROP DEFAULT,
  ALTER COLUMN "execFisicaPct" SET NOT NULL,
  ALTER COLUMN "execFinanceiraPct" DROP DEFAULT,
  ALTER COLUMN "execFinanceiraPct" SET NOT NULL;

ALTER TABLE "RelatorioQuinzenal"
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "deletedAt" TIMESTAMP(3);

ALTER TABLE "RelatorioQuinzenal"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "RelatorioQuinzenal_projetoId_dataRef_desc_idx" ON "RelatorioQuinzenal"("projetoId", "dataRef" DESC);
CREATE INDEX "RelatorioQuinzenal_contratoId_dataRef_desc_idx" ON "RelatorioQuinzenal"("contratoId", "dataRef" DESC);
CREATE INDEX "RelatorioQuinzenal_projetoId_contratoId_dataRef_desc_idx" ON "RelatorioQuinzenal"("projetoId", "contratoId", "dataRef" DESC);
