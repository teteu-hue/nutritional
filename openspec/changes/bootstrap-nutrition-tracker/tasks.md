## 1. Setup do repositório e ferramentas

- [x] 1.1 Scaffold do projeto Next.js 15 (App Router, TypeScript, Tailwind, ESLint, App Router, `src/` directory) com `pnpm create next-app@latest`; verificar rodando `pnpm dev` e acessando `http://localhost:3000` com sucesso.
- [x] 1.2 Adicionar dependências: `prisma`, `@prisma/client`, `@prisma/adapter-neon`, `@vercel/postgres`, `next-auth@5`, `@auth/prisma-adapter`, `@node-rs/argon2`, `zod`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `date-fns`; e devDeps: `tsx`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `playwright` (opcional); verificar rodando `pnpm install` sem erro e `pnpm build` funcionando.
- [x] 1.3 Configurar shadcn/ui (`pnpm dlx shadcn@latest init`) e adicionar componentes iniciais (`button`, `input`, `form`, `card`, `dialog`, `progress`, `table`, `toast`); verificar que `src/components/ui/` contém os arquivos e `pnpm build` continua verde.
- [x] 1.4 Criar `.env.example` com `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `AUTH_SECRET`, `AUTH_URL`, `DEEPSEEK_API_KEY`, `AI_RATE_LIMIT_PER_HOUR=20`; adicionar `src/server/core/config.ts` que valida `process.env` com Zod no boot; verificar com `pnpm tsx src/server/core/config.ts` levantando erro esperado se faltar `AUTH_SECRET`.
- [x] 1.5 Configurar ESLint + Prettier alinhados; verificar rodando `pnpm lint` e `pnpm format --check` sem violações.
- [x] 1.6 Criar `scripts/pg-init/00-unaccent.sql` com `CREATE EXTENSION IF NOT EXISTS unaccent;` para o Postgres do Compose; verificar que o container `db` sobe e `psql -c "SELECT unaccent('ação');"` retorna `acao`.

## 2. Docker Compose para dev local

- [x] 2.1 Escrever `docker/Dockerfile.web` (Node 20 slim + pnpm, `WORKDIR /app`, expõe 3000, cmd `pnpm dev`); verificar com `docker build -f docker/Dockerfile.web .` completando sem erro.
- [x] 2.2 Escrever `docker-compose.yml` com serviços `db` (postgres:16 com volume `pgdata` e `./scripts/pg-init` montado) e `web` (build do `Dockerfile.web`, `depends_on: [db]`, bind mount do repo, env vars a partir de `.env.local`); verificar com `docker compose config` e `docker compose up -d db` seguido de `psql "postgres://postgres:postgres@localhost:5432/nutri" -c "SELECT 1"`.
- [x] 2.3 Documentar comandos `pnpm db:migrate` (`prisma migrate deploy`), `pnpm db:migrate:dev` (`prisma migrate dev`), `pnpm seed` (`tsx scripts/seed-foods.ts`) no `package.json`; verificar cada script individualmente com `pnpm <script> --help`/dry-run.
- [ ] 2.4 Verificar smoke ponta-a-ponta local: `docker compose up --build`, `docker compose exec web pnpm db:migrate`, `docker compose exec web pnpm seed`, `curl http://localhost:3000/api/v1/health` retorna 200.

## 3. Prisma e banco de dados

- [x] 3.1 Rodar `pnpm dlx prisma init` e configurar `prisma/schema.prisma` com `provider = "postgresql"`, `previewFeatures = ["driverAdapters"]`, `directUrl = env("POSTGRES_URL_NON_POOLING")`, `url = env("DATABASE_URL")`; verificar com `pnpm prisma format` sem erro.
- [x] 3.2 Modelar em `schema.prisma` todas as entidades do `design.md` — `User` (com `onboardingCompletedAt DateTime?`), `UserProfile` (com `bodyFatPercent Decimal? @db.Decimal(4, 2)`), `Session` (padrão Auth.js), `Food`, `Meal`, `MealItem`, `NutritionGoalOverride`, `AiInteraction`, `RateLimitHit` — com relações, `@db.Decimal(10, 2)` nos macros, enums, `@unique` e `@index` apropriados; verificar com `pnpm prisma validate`.
- [x] 3.3 Gerar a primeira migração (`pnpm prisma migrate dev --name init`) e complementar por SQL bruto o índice funcional `foods_name_unaccent_idx ON foods (LOWER(unaccent(name)))`; verificar com `psql -c "\di"` mostrando o índice e um `EXPLAIN` da busca usando-o.
- [x] 3.4 Criar `src/server/core/db.ts` que exporta uma instância `prisma` reutilizando a global em dev (`globalThis.__prisma ??= new PrismaClient(...)`) e criando via `@prisma/adapter-neon` em produção; verificar com um teste que `getPrisma()` chamado duas vezes retorna a mesma instância em dev.

## 4. Autenticação (capability: user-accounts)

- [x] 4.1 Configurar Auth.js v5 em `src/auth.ts` com `strategy: "database"`, `PrismaAdapter(prisma)`, Credentials Provider recebendo `email`, `password`; verificar com um teste que `signIn("credentials", { email, password })` cria uma linha `Session`.
- [x] 4.2 Implementar `src/server/user-accounts/security.ts` com `hashPassword` e `verifyPassword` sobre `@node-rs/argon2`; verificar com Vitest cobrindo hash, verificação positiva e negativa.
- [x] 4.3 Implementar `POST /api/v1/auth/signup` (Route Handler) que valida payload Zod (e-mail único, senha ≥ 8), cria `User` e retorna sessão via `signIn` server-side; verificar cobrindo scenarios "Cadastro bem-sucedido", "E-mail já cadastrado" e "Senha fraca" (`specs/user-accounts/spec.md`).
- [x] 4.4 Implementar `POST /api/v1/auth/login` que delega ao Credentials Provider e devolve cookie de sessão; verificar cobrindo scenarios "Login bem-sucedido" e "Credenciais inválidas" (mensagem genérica).
- [x] 4.5 Implementar `POST /api/v1/auth/logout` que chama `signOut` do Auth.js (deleta a `Session` no banco); verificar com teste: login → logout → chamada autenticada retorna 401 (cobre "Logout invalida o token").
- [x] 4.6 Implementar `POST /api/v1/auth/session-token` que emite um bearer token opaco vinculado à `Session` corrente (para clientes de API não-browser); verificar cobrindo emissão, uso subsequente e invalidação após logout.
- [x] 4.7 Criar helper `requireUser()` em `src/server/core/auth.ts` que resolve a sessão (cookie ou Bearer) e retorna 401 quando ausente/expirada/revogada; verificar cobrindo token ausente, malformado, expirado e revogado — todos 401 (cobre "Sessão inválida ou expirada").
- [x] 4.8 Implementar `GET/PUT /api/v1/profile` com validação Zod de `activity_level`, `goal`, `biological_sex`, `height_cm > 0`, `weight_kg ∈ [20, 400]` e `body_fat_percent` opcional ∈ [3, 75] (aceita `null`/omitido para limpar); o handler `PUT` também grava `users.onboarding_completed_at = now()` na mesma transação quando o perfil vira "completo" pela primeira vez; verificar cobrindo "Completar o perfil após o cadastro", "Atualização de peso", "Atualização de percentual de gordura", "Limpar percentual de gordura" e "Valor fora do domínio".
- [x] 4.9 Aplicar em cada repositório da capability o filtro `where: { userId: currentUserId }` e devolver 404 quando recurso pertence a outro usuário; verificar com teste em que o usuário A tenta ler o perfil do usuário B e recebe 404 (cobre "Isolamento de dados por usuário" e "Acesso a recurso de outro usuário").

## 5. Capability: food-catalog

- [x] 5.1 Implementar `scripts/seed-foods.ts` que lê CSV da TACO, valida os 6 campos nutricionais obrigatórios e insere `Food` com `source='base'` de forma idempotente (upsert por `(source, name)`); verificar rodando em banco limpo e conferindo `SELECT COUNT(*) FROM "Food" WHERE source='base'` > 0 e ausência de campos nulos.
- [x] 5.2 Implementar `GET /api/v1/foods/[id]` que retorna alimento base ou personalizado do próprio usuário e 404 para personalizado de outro usuário; verificar cobrindo "Consulta ao catálogo base" e o cenário de isolamento.
- [x] 5.3 Implementar `GET /api/v1/foods?search=&page=&pageSize<=50` usando raw SQL com `LOWER(unaccent(name)) LIKE LOWER(unaccent($1))`; verificar cobrindo "Busca com resultados", "Busca sem resultados", "Insensibilidade a acentos e caixa".
- [x] 5.4 Implementar `POST /api/v1/foods` (custom food) com validação Zod (nome 1–120, macros ≥ 0); verificar cobrindo "Criação de alimento personalizado", "Valor nutricional negativo" e "Nome ausente ou muito longo".
- [x] 5.5 Implementar `PUT /api/v1/foods/[id]` restrito ao dono; verificar cobrindo "Edição de alimento personalizado" **e** com teste explícito que uma refeição registrada antes da edição mantém os snapshots inalterados após a edição (regressão do requisito de imutabilidade).
- [x] 5.6 Implementar `DELETE /api/v1/foods/[id]` com soft delete (`deletedAt`) para preservar refeições antigas; verificar com teste que o alimento some da busca mas as refeições históricas continuam legíveis.
- [x] 5.7 Garantir que a busca combina `source='base' OR ownerUserId = currentUserId`; verificar com teste em que o usuário A cria um alimento e o usuário B não o vê (cobre "Visibilidade restrita").

## 6. Capability: meal-logging

- [x] 6.1 Implementar `POST /api/v1/meals` que valida `mealType`, `mealDate`, itens com alimento acessível e porção > 0, e materializa snapshots (`*_snapshot`) e totais em `Meal`; verificar cobrindo "Criação de uma refeição válida", "Item com alimento inacessível" e "Porção não positiva".
- [x] 6.2 Implementar cálculo de totais como `sum_over_items(valor_por_100 * porção / 100)` em `src/server/meal-logging/service.ts` com `Decimal.js`; verificar com testes Vitest canônicos (ex.: 150 g × 200 kcal/100 g = 300 kcal) — cobre "Totais calculados corretamente".
- [x] 6.3 Garantir que leituras de `Meal` NÃO fazem `JOIN` recomputando valores de `Food`; verificar com teste que cria refeição, edita o `Food` referenciado, re-lê a refeição — totais permanecem os originais (cobre "Snapshot nutricional imutável").
- [x] 6.4 Implementar `PUT /api/v1/meals/[id]` e `POST/PUT/DELETE /api/v1/meals/[id]/items[/[itemId]]` com recomputo de totais em cada mutação (dentro da mesma transação); verificar cobrindo "Atualização de item".
- [x] 6.5 Implementar `DELETE /api/v1/meals/[id]` com cascade Prisma nos itens; verificar cobrindo "Remoção de refeição".
- [x] 6.6 Implementar `GET /api/v1/meals?date=YYYY-MM-DD` ordenado por `mealTime NULLS LAST, createdAt`; verificar cobrindo "Listagem por dia" e o isolamento por usuário.

## 7. Capability: nutrition-goals

- [x] 7.1 Implementar `computeDailyTargets(profile)` com Mifflin–St Jeor, fatores de atividade e ajustes por objetivo; verificar com testes unitários para ao menos um caso de cada `activity_level` e cada `goal`.
- [x] 7.2 Implementar `GET /api/v1/goals` que retorna metas ativas com flag `origin ∈ {"auto","manual"}`; verificar cobrindo "Metas geradas quando o perfil está completo", "Perfil incompleto", "Metas auto-calculadas".
- [x] 7.3 Implementar `PUT /api/v1/goals/override` gravando `NutritionGoalOverride`, incluindo validação de consistência (soma dos macros bate com kcal em ±5%, todos ≥ 0); verificar cobrindo "Aplicação de override" e "Override inválido".
- [x] 7.4 Implementar `DELETE /api/v1/goals/override` que apaga a linha; verificar cobrindo "Limpeza do override" e que `GET /api/v1/goals` volta a marcar `origin='auto'`.

## 8. Capability: nutrition-dashboard

- [x] 8.1 Implementar `GET /api/v1/dashboard/daily?date=YYYY-MM-DD` agregando `Meal` por data e comparando às metas ativas; verificar cobrindo "Dia com refeições registradas", "Dia sem refeições registradas" e "Perfil incompleto ainda sem metas".
- [x] 8.2 Implementar `GET /api/v1/dashboard/weekly?iso_week=YYYY-Www` retornando 7 dias em ordem cronológica e média sobre dias não-vazios; verificar cobrindo "Semana parcialmente preenchida" e "Ordenação dos dias".
- [x] 8.3 Adicionar teste ponta-a-ponta com dois usuários registrando refeições na mesma data recebendo resumos independentes (cobre "Dados de outros usuários não aparecem").

## 9. Capability: ai-diet-assistant

- [x] 9.1 Definir a interface `AIDietProvider` e implementar `DeepSeekProvider` em `src/server/ai-diet-assistant/providers/deepseek.ts` usando `fetch` global, `AbortController` com timeout de 25 s e 1 retry manual em 5xx/timeout, `max_tokens=800`, `temperature=0.4`; verificar com um teste que faz mock de `fetch` e valida payload, headers e retry.
- [x] 9.2 Implementar `buildRedactedContext(userId)` em `src/server/ai-diet-assistant/redact.ts` retornando apenas `activeTargets`, `consumedToday`, `goal` e `intent`; adicionar teste negativo que garante que `email`, `password`, `sessionToken` e dados de outros usuários NUNCA aparecem no output (cobre "Contexto mínimo obrigatório" e a proibição de dados sensíveis).
- [x] 9.3 Implementar `POST /api/v1/ai/diet-suggestions` que rejeita intent vazio, exige perfil e metas ativas, chama o provider, retorna `{ suggestion, disclaimer, interactionId }`; verificar cobrindo "Sugestão gerada com sucesso", "Intent vazio", "Perfil incompleto" e "Disclaimer presente".
- [x] 9.4 Fazer `config.ts` marcar `DEEPSEEK_API_KEY` como opcional e o endpoint responder erro de configuração (503) sem chamar HTTP externo se ausente; adicionar teste que verifica log e resposta não vazam a chave (cobre "Chave ausente" e "Chave nunca aparece em logs").
- [x] 9.5 Implementar `rateLimit({ userId, scope, limit: 20, windowMs: 3_600_000 })` em `src/server/ai-diet-assistant/rate-limit.ts` como sliding window sobre `RateLimitHit`; verificar com teste que 20 requisições passam e a 21ª retorna 429 informando o reset (cobre "Dentro do limite" e "Limite excedido").
- [x] 9.6 Persistir cada chamada em `AiInteraction` — sucesso e falha — com `redactedContext`, `tokensPrompt`, `tokensCompletion` e `status`; verificar cobrindo "Registro após sucesso" e "Registro após falha do provider".
- [x] 9.7 Implementar `GET /api/v1/ai/history` restrito ao usuário; verificar com teste de isolamento (usuário A não vê interações do usuário B).

## 10. Frontend (Next.js UI)

- [x] 10.1 Configurar `src/app/providers.tsx` com `QueryClientProvider` do TanStack Query e wrapper de tema; envolver o `layout.tsx` raiz; verificar com `pnpm build` verde.
- [x] 10.2 Implementar telas `/signup` e `/login` (Client Components com Server Actions internas) com Zod validation espelhada ao backend; verificar com RTL cobrindo feedback de senha fraca e e-mail duplicado (cobre "Cadastro bem-sucedido", "E-mail já cadastrado", "Senha fraca" e "Credenciais inválidas").
- [x] 10.2.1 Implementar `src/app/(app)/onboarding/page.tsx` como Client Component com React Hook Form + Zod cobrindo, num único formulário, data de nascimento, sexo biológico, altura (cm), peso atual (kg), percentual de gordura corporal (opcional, 3–75), nível de atividade e objetivo; submissão chama `PUT /api/v1/profile` e, no sucesso, faz `router.replace('/dashboard')`; verificar com RTL o fluxo feliz (todos os campos válidos → redirect) e o fluxo com body fat vazio (aceito, redirect ocorre igual).
- [x] 10.2.2 Implementar `src/middleware.ts` que, para rotas do grupo `(app)/*`, verifica a sessão Auth.js e, quando `session.user.onboardingCompletedAt` é nulo, redireciona para `/onboarding` (exceto quando o próprio pathname já é `/onboarding`); para as rotas `/api/v1/*` fora de `auth` e `profile`, `requireUser()` responde 409 `onboarding_required`; verificar com testes de integração cobrindo "Onboarding é a próxima tela após o cadastro", "Bloqueio de rotas até o onboarding ser concluído" e "Onboarding não é repetido em logins subsequentes".
- [x] 10.2.3 Adicionar ao `api-client.ts` interceptação de resposta 409 `onboarding_required` para redirecionar o usuário para `/onboarding` no cliente; verificar com RTL simulando uma chamada de API que retorna esse status a partir de uma rota autenticada e assertando o redirect.
- [x] 10.2.4 Fazer o handler de sucesso do `POST /api/v1/auth/signup` redirecionar (server-side) o cliente para `/onboarding` após criar a conta e autenticar o usuário; verificar com RTL de ponta-a-ponta que após um cadastro bem-sucedido a próxima URL renderizada é `/onboarding` e não `/dashboard`.
- [x] 10.3 Implementar `/foods` (busca + criar/editar personalizados) com paginação; verificar RTL: digitar termo dispara busca e criar personalizado com valores válidos aparece na próxima busca.
- [x] 10.4 Implementar `/meals` (listar por data, criar refeição com N itens, editar, excluir); verificar RTL criando refeição com 2 itens e checando totais devolvidos pelo backend.
- [x] 10.5 Implementar `/goals` (metas ativas com badge de origem, ativar/limpar override); verificar RTL de override válido e de erro de consistência.
- [x] 10.6 Implementar `/dashboard` (Server Component com resumo diário + barras `Progress` por macro + resumo semanal); verificar RTL renderizando estado sem refeições, estado com refeições e estado sem metas.
- [x] 10.7 Implementar `/assistant` (input de intent, exibição da sugestão, disclaimer sempre visível, histórico paginado); verificar RTL cobrindo envio bem-sucedido (fetch mockado) e caso "limite atingido".
- [x] 10.8 Garantir que `DEEPSEEK_API_KEY` NÃO aparece no bundle do cliente; verificar por `rg` em `.next/static/**` após `pnpm build` que a string da chave não está presente.

## 11. Deploy Vercel

- [ ] 11.1 Criar o projeto Vercel apontando para o repositório Git; verificar que a Vercel detecta framework Next.js e o primeiro build (ainda sem Postgres) sobe.
- [ ] 11.2 Adicionar a integração **Vercel Postgres** ao projeto; verificar em Project Settings → Storage que o banco aparece e as env vars `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL` estão populadas em Production e Preview.
- [ ] 11.3 Adicionar Environment Variables manuais (`DEEPSEEK_API_KEY`, `AUTH_SECRET`, `AUTH_URL`, `AI_RATE_LIMIT_PER_HOUR`) em Production e Preview; verificar via `vercel env ls`.
- [x] 11.4 Adicionar `"vercel-build": "prisma migrate deploy && prisma generate && next build"` ao `package.json`; verificar em um deploy que o log mostra "X migrations applied" antes do build.
- [ ] 11.5 Rodar o seed inicial contra a produção: `vercel env pull .env.production.local && pnpm seed` (que usa `POSTGRES_URL_NON_POOLING`); verificar `SELECT COUNT(*) FROM "Food" WHERE source='base'` > 0 no banco de produção.
- [x] 11.6 Configurar `vercel.json` (se necessário) para elevar `maxDuration` do endpoint de IA para 60 s no plano Pro; verificar que `GET https://<app>.vercel.app/api/v1/health` responde 200 e que `POST /api/v1/ai/diet-suggestions` completa dentro do limite em um smoke com prompt grande.
- [ ] 11.7 Testar um fluxo ponta-a-ponta em produção: criar conta, completar perfil, registrar refeição, ver dashboard e pedir uma sugestão à IA; verificar que cada passo funciona no domínio `*.vercel.app`.

## 12. Documentação, validação e verificação final

- [x] 12.1 Escrever `README.md` cobrindo (a) pré-requisitos, (b) trilha "dev com Docker Compose" (comandos exatos), (c) trilha "deploy Vercel" (integração Postgres, env vars, primeiro deploy, seed), (d) comandos de teste; verificar seguindo o README do zero em uma máquina limpa até obter `/api/v1/health` OK localmente e na Vercel.
- [x] 12.2 Escrever `docs/deepseek-integration.md` documentando payload enviado, campos redigidos, limites de rate/token, disclaimer, custo estimado por chamada e procedimento de rotação de chave via `vercel env`; verificar por revisão cruzada contra `specs/ai-diet-assistant/spec.md`.
- [x] 12.3 Escrever `docs/local-dev.md` com o roteiro Docker Compose completo (variáveis, comandos, troubleshooting de `unaccent` e cold start do container); verificar seguindo o roteiro em um clone limpo.
- [x] 12.4 Rodar `pnpm dlx openspec validate bootstrap-nutrition-tracker --strict` sem erros; verificar exit code 0.
- [x] 12.5 Executar suíte completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; verificar todos verdes localmente e no CI da Vercel (preview).
- [ ] 12.6 Executar teste manual ponta-a-ponta (roteiro em `docs/manual-e2e.md`): cadastrar, completar perfil, buscar alimento, registrar duas refeições, ver dashboard atualizado, definir override, pedir sugestão à IA, fazer logout — todos os passos com o resultado observável descrito no roteiro, executados uma vez em Docker Compose e uma vez em Vercel preview.
