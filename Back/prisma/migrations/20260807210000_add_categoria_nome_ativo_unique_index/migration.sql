-- Garante no banco (não só na aplicação) que duas categorias ATIVAS da mesma empresa não
-- dividam o mesmo nome, mesmo sob criação/atualização concorrente (race condition entre o
-- findFirst de checagem de duplicidade e o create/update em CreateCategoriaService e
-- UpdateCategoriaService). É um índice parcial (WHERE "ativo" = true) porque soft delete
-- permite que uma categoria inativa mantenha o nome enquanto uma nova categoria ativa usa
-- o mesmo nome.
CREATE UNIQUE INDEX "Categoria_empresaId_nome_ativo_key" ON "Categoria"("empresaId", "nome") WHERE "ativo" = true;
