-- CreateIndex
CREATE INDEX "Categoria_empresaId_ativo_idx" ON "Categoria"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "Movimentacao_produtoId_criadoEm_idx" ON "Movimentacao"("produtoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Movimentacao_empresaId_idx" ON "Movimentacao"("empresaId");

-- CreateIndex
CREATE INDEX "Produto_empresaId_ativo_idx" ON "Produto"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_idx" ON "Produto"("categoriaId");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");
