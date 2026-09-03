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

1. Crie um projeto Vercel apontando para este repositório.
2. Adicione a integração **Vercel Postgres**.
3. Configure variáveis: `AUTH_SECRET`, `AUTH_URL`, `DEEPSEEK_API_KEY`, `AI_RATE_LIMIT_PER_HOUR=20`.
4. O script `vercel-build` aplica migrações e faz o build.
5. Após o primeiro deploy: `vercel env pull .env.production.local && pnpm seed:prod`.

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
