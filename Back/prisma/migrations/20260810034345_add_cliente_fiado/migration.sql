-- AlterEnum
ALTER TYPE "FormaPagamento" ADD VALUE 'FIADO';

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "clienteId" UUID;

-- CreateTable
CREATE TABLE "Cliente" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "limiteCredito" DECIMAL(10,2),
    "empresaId" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoFiado" (
    "id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "clienteId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoFiado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cliente_empresaId_ativo_idx" ON "Cliente"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "PagamentoFiado_clienteId_criadoEm_idx" ON "PagamentoFiado"("clienteId", "criadoEm");

-- CreateIndex
CREATE INDEX "PagamentoFiado_empresaId_idx" ON "PagamentoFiado"("empresaId");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoFiado" ADD CONSTRAINT "PagamentoFiado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoFiado" ADD CONSTRAINT "PagamentoFiado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoFiado" ADD CONSTRAINT "PagamentoFiado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
