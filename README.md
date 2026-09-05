# Nutritional — Acompanhamento Nutricional

Aplicação web para registro de refeições, metas nutricionais e assistente de IA (DeepSeek).

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL 16 (local via Docker Compose ou instalação nativa)

## Desenvolvimento local

### Opção A — Docker Compose

```bash
cp .env.example .env.local
# Edite AUTH_SECRET e opcionalmente DEEPSEEK_API_KEY
docker compose up --build
docker compose exec web pnpm db:migrate
docker compose exec web pnpm seed
curl http://localhost:3000/api/v1/health
```

### Opção B — Postgres local + Next.js

```bash
cp .env.example .env.local
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Acesse `http://localhost:3000`.

## Deploy Vercel

1. **Use a branch com o código** — merge o [PR #2](https://github.com/teteu-hue/nutritional/pull/2) ou faça deploy de `cursor/implement-bootstrap-plan-0c7a`. A `main` antiga só tinha planejamento OpenSpec (sem Next.js).
2. Crie o projeto Vercel apontando para este repositório.
3. Adicione a integração **Vercel Postgres** (Storage).
4. Configure variáveis em **Production**:
   - `AUTH_SECRET` — string aleatória ≥ 32 caracteres (**obrigatório**)
   - `AUTH_URL` — ex.: `https://seu-projeto.vercel.app`
   - `DEEPSEEK_API_KEY` — opcional
   - `AI_RATE_LIMIT_PER_HOUR=20`
   - `POSTGRES_*` vem do Storage; o app mapeia `POSTGRES_PRISMA_URL` → `DATABASE_URL` automaticamente.
5. O script `vercel-build` aplica migrações e faz o build.
6. Após o primeiro deploy OK: `vercel env pull .env.production.local && pnpm seed:prod`.
7. Se previews pedirem login Vercel: desative **Deployment Protection** (Project Settings) ou use a URL de Production.

**Smoke test:** `curl https://SEU-DOMINIO.vercel.app/api/v1/health` deve retornar `{"status":"ok","version":"v1"}`. Se der `NOT_FOUND`, o deploy ainda não tem a API — confira o commit nos logs de build.

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm test` | Testes Vitest |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificação TypeScript |
| `pnpm db:migrate` | Aplica migrações |
| `pnpm seed` | Popula catálogo base de alimentos |

## Fluxo do usuário

1. **Cadastro** em `/signup` → redirect para `/onboarding`
2. **Onboarding** coleta altura, peso, % gordura (opcional), atividade e objetivo
3. **Dashboard**, refeições, alimentos, metas e assistente de IA

## OpenSpec

O planejamento está em `openspec/changes/bootstrap-nutrition-tracker/`.

```bash
openspec validate bootstrap-nutrition-tracker --strict
```
