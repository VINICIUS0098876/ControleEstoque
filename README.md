# Controle de Estoque

Sistema de controle de estoque multi-tenant: cada empresa cadastrada só enxerga seus
próprios produtos, categorias, movimentações e usuários.

## Stack

**Back** (`Back/`): Node + Express + TypeScript, Prisma ORM sobre PostgreSQL (Supabase),
autenticação por JWT (access token curto em cookie httpOnly + refresh token rotativo),
validação de entrada com Zod, testes unitários com Vitest.

**Front** (`Front/`): React + Vite + TypeScript, TanStack Query, React Hook Form + Zod,
shadcn/ui + Tailwind, testes end-to-end com Playwright.

## Arquitetura

- **Multi-tenant por `Empresa`**: toda entidade (`Produto`, `Categoria`, `Movimentacao`,
  `Usuario`) pertence a uma empresa; toda query de leitura/escrita é escopada por
  `empresaId`, nunca por dado vindo direto do body da requisição.
- **Papéis**: `ADMIN` (dono, criado junto com a empresa) e `FUNCIONARIO` (criado pelo
  ADMIN). Rotas sensíveis (gestão de usuários, dados da empresa) exigem `ADMIN`
  (`Back/src/middlewares/middlewareRole.ts`); o front espelha essa regra na navegação
  (`Front/src/components/auth/require-role.tsx`), mas a autorização real é sempre no back.
- **Soft delete**: nada é apagado de verdade — os registros ganham `ativo: false` e
  `deletadoEm`, preservando histórico e permitindo reativação.
- **Movimentação como histórico imutável**: o estoque de um produto só muda através de
  uma `Movimentacao` (entrada/saída/estorno); não existe update direto de quantidade.

## Estrutura

```
Back/    API REST (controllers -> services -> Prisma)
Front/   SPA React consumida pela API
```

## Rodando localmente

Pré-requisitos: Node 22+, um banco PostgreSQL acessível (o projeto foi desenvolvido
contra um Supabase, mas qualquer Postgres serve).

### Back

```bash
cd Back
cp .env.example .env      # preencha DATABASE_URL, DIRECT_URL e SECRET_KEY
npm install
npx prisma migrate deploy # aplica as migrations existentes no banco
npm run dev                # http://localhost:3000
```

### Front

```bash
cd Front
cp .env.example .env      # VITE_API_URL, padrão http://localhost:3000
npm install
npm run dev                # http://localhost:5173
```

## Testes

```bash
cd Back && npm test        # Vitest — services/middlewares com Prisma mockado, sem banco real
cd Front && npm run test:e2e  # Playwright — sobe Back+Front e roda contra um Postgres real
```

A suíte e2e não é mockada de propósito: ela sobe o Back e o Front de verdade (ver
`Front/playwright.config.ts`) e precisa de um `Back/.env` válido apontando pra um banco
de teste.

## CI

`.github/workflows/ci.yml` roda em todo push/PR para `main`: typecheck + build + testes
unitários do Back, e lint + typecheck + build do Front. A suíte e2e não roda em CI (exigiria
provisionar um banco de teste dedicado e segredos de CI à parte).
