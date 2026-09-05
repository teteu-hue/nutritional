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

1. Crie (ou reconecte) o projeto Vercel apontando para a branch **`main`** deste repositório.
2. **Criar banco Postgres (via Neon):**
   - Vercel Dashboard → seu projeto → **Storage** → **Create Database**
   - Na lista **Marketplace Database Providers**, escolha **Neon** (*Serverless Postgres*)
   - Clique **Add Integration** → crie conta Neon (se precisar) → **Connect to Project**
   - A integração injeta `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e `POSTGRES_*` automaticamente
   - Alternativas compatíveis: **Supabase** ou **Prisma Postgres** (também são Postgres)
3. Em **Settings → Environment Variables** (Production):
   - `AUTH_SECRET` — string aleatória ≥ 32 caracteres (**obrigatório**). Ex.: `openssl rand -base64 32`
   - `AUTH_URL` — URL de produção, ex.: `https://nutritional.vercel.app`
   - `DEEPSEEK_API_KEY` — opcional (assistente de IA)
   - `AI_RATE_LIMIT_PER_HOUR=20` — opcional
4. Faça **Redeploy** (Deployments → ⋯ → Redeploy). O script `vercel-build` valida env, aplica migrações e faz o build.
5. Após deploy OK: `vercel env pull .env.production.local && pnpm seed:prod` (catálogo base de alimentos).

### Troubleshooting

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| Build falha com `[ensure-vercel-env] ERRO` | Postgres ou `AUTH_SECRET` não configurados | Passos 2–3 acima, depois redeploy |
| `/api/v1/health` retorna `NOT_FOUND` | Produção ainda no deploy antigo (build falhou ou projeto errado) | Confira Deployments: o último deve estar **Ready** no commit da `main` |
| Homepage mostra loader / I18nProvider | Domínio aponta para **outro** projeto Vercel (código antigo) | Settings → Domains: confira qual projeto usa `nutritional.vercel.app` |
| Preview pede login Vercel | Deployment Protection ativo | Settings → Deployment Protection → desativar ou usar URL de Production |

**Smoke test:** `curl https://SEU-DOMINIO.vercel.app/api/v1/health` → `{"status":"ok","version":"v1"}`.

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
