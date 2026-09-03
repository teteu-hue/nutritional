# Desenvolvimento local

## Docker Compose

```bash
docker compose up --build
docker compose exec web pnpm db:migrate
docker compose exec web pnpm seed
```

Serviços:

- `db` — Postgres 16 com extensão `unaccent` e função `f_unaccent` (via `scripts/pg-init/`)
- `web` — Next.js em `pnpm dev`

## Variáveis (.env.local)

Copie de `.env.example`. Mínimo:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nutri
POSTGRES_URL_NON_POOLING=postgres://postgres:postgres@localhost:5432/nutri
AUTH_SECRET=<string aleatória ≥16 chars>
AUTH_URL=http://localhost:3000
```

## Troubleshooting

### `unaccent` / busca de alimentos

Certifique-se de que a extensão e a função existem:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE OR REPLACE FUNCTION f_unaccent(text) ...
```

### Cold start do container `web`

O primeiro `pnpm install` dentro do container pode demorar. Use `docker compose up --build` após mudanças em `package.json`.

### Prisma migrate

```bash
pnpm db:migrate:dev   # desenvolvimento
pnpm db:migrate       # deploy / CI
```
