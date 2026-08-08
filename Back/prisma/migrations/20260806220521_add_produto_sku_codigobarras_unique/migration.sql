-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_sku_key" ON "Produto"("empresaId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_codigoBarras_key" ON "Produto"("empresaId", "codigoBarras");
