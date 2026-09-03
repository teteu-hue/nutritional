## Context

Este é um projeto **greenfield** cujo alvo de produção é a **Vercel**, com o banco em **Vercel Postgres** (Neon). Todas as escolhas de stack são feitas aqui. Para o *porquê* e o *o que* deste change, consulte `proposal.md` — não os repito. As restrições concretas herdadas da proposta que moldam esta arquitetura são:

- **Roda em Vercel Functions (runtime Node.js)**: instâncias efêmeras, cold start, limite de duração por requisição (**10 s no plano Hobby, 60 s no plano Pro**) e sem estado local persistente entre requisições.
- **Banco em Vercel Postgres**: conexão via **pooler serverless** (URL `POSTGRES_URL`); acesso direto sem pooler é usado só para migrações (`POSTGRES_URL_NON_POOLING`). Nada de PgBouncer auto-hospedado.
- **Docker Compose apenas para dev local** (Postgres 16 local + opcionalmente o `next dev` containerizado). Produção é 100% Vercel.
- Um único provider externo obrigatório: **DeepSeek** (chave lida server-side, nunca chega ao browser).
- Dados pessoais sensíveis (peso, medidas, hábitos alimentares) exigindo isolamento por usuário e mínimo respeito à LGPD.
- Interface, dados nutricionais base e respostas da IA em português (BR).
- Escopo MVP: um único ambiente Vercel de produção (com Preview Environments automáticos), sem multi-tenant, sem billing.
- Snapshot nutricional imutável nas refeições — quando o alimento é editado depois do registro, os totais persistidos da refeição não mudam (definido em `specs/meal-logging/spec.md`).

## Goals / Non-Goals

**Goals:**
- Definir uma stack **Vercel-native** que consiga entregar as 6 capabilities da proposta com um único deploy.
- Definir contratos de API REST estáveis por capability, que sejam ao mesmo tempo o input do frontend e a fronteira testável dos specs.
- Definir o modelo de dados que sustenta o cálculo de macros por refeição, o snapshot nutricional imutável e as metas com override.
- Definir a integração com o DeepSeek isolada em uma camada de "AI provider", com controle de custo, auditoria e possibilidade de troca de provider no futuro.
- Definir uma experiência de dev local sem depender da Vercel (Docker Compose com Postgres local).
- Definir o pipeline de deploy: como as migrações de banco rodam no build da Vercel e como os segredos são configurados.

**Non-Goals:**
- Provider de banco alternativo (Supabase, Railway, Fly.io) — a proposta fixou Vercel Postgres.
- Deploy do runtime da aplicação fora da Vercel — Docker é ferramenta de dev, não de deploy.
- Uso de Vercel Edge Runtime — usaremos Node.js runtime porque Prisma e `@node-rs/argon2` dependem dele.
- Otimizações de escala além do rate limit por usuário e do pooler serverless nativo.
- Internacionalização além de PT-BR.
- App mobile nativo (web responsivo é suficiente).

## Decisions

### Stack de aplicação

**Decisão:** **Next.js 15 (App Router) + TypeScript 5**, com a **API implementada como Route Handlers** sob `app/api/v1/*` e a **UI em Server Components + Client Components**. Banco: **Vercel Postgres**, acessado por **Prisma 5** (Client + Migrate). Autenticação: **Auth.js v5 (`next-auth@5`)** com Credentials Provider e adapter Prisma. UI: **Tailwind CSS + shadcn/ui**. Validação: **Zod** compartilhado entre server e client.

Um único monorepo trivial, um único projeto Vercel: `.` na raiz é o app Next.js.

**Rationale:**
- Vercel é o "home" do Next.js — o path de menor fricção para deploy, previews por PR, environment variables e integração com Vercel Postgres.
- Single-language TypeScript end-to-end reduz o switching cost e permite compartilhar schemas Zod entre validação de payload no backend e nos formulários (React Hook Form).
- Prisma é o padrão de ORM na comunidade Next.js/Vercel; oferece migrações declarativas e cliente tipado que casa bem com Route Handlers.
- Auth.js v5 é o padrão atual de auth em Next.js e tem adapter Prisma pronto para persistir sessões.

**Alternativas consideradas:**
- **FastAPI (Python) em Vercel Python Functions**: possível, mas cada função Python precisa de embrulho ASGI, tem cold start maior e o ecossistema de bibliotecas Vercel-first é em JS/TS; escolhemos Next.js por coerência com a plataforma.
- **Backend separado em Fastify/NestJS + frontend Next.js**: dois deploys, dois runtimes, sem ganho no MVP.
- **`@vercel/postgres` sem Prisma**: driver mais leve, mas perdemos migrações declarativas, cliente tipado e um ecossistema maduro; usaremos `@vercel/postgres` **por baixo do Prisma** (como driver adapter).

### Autenticação

**Decisão:** **Auth.js v5 com Credentials Provider** para email + senha, sessão **database** (não JWT), persistida em `Session` no Postgres via o adapter Prisma. Hash de senha com **`@node-rs/argon2`** (Argon2id).

**Rationale:**
- O spec `user-accounts` exige que o logout invalide o token imediatamente. Sessões *database* satisfazem isso trivialmente (delete/expire da linha). JWTs stateless exigiriam denylist — mais complexidade sem ganho.
- `@node-rs/argon2` tem binários pré-compilados via napi-rs, funciona em Vercel Functions e é rápido; evita `bcrypt` (nativo, requer build), `bcryptjs` (mais lento, sem Argon2) e `argon2` (JS bindings menos amigáveis a serverless).
- Auth.js já lida com CSRF, cookies HttpOnly/Secure/SameSite e session rotation.

**Nota de conformidade com o spec:** o requisito "sessão via token" é atendido por sessão *database* — o cliente pode usar cookies de sessão gerenciados pelo Auth.js (padrão em Next.js) ou, para clientes de API que exijam um `Authorization: Bearer <token>`, uma rota dedicada `POST /api/v1/auth/session-token` emitirá um session-token opaco vinculado à mesma linha `Session`. Assim os cenários de "Sessão inválida ou expirada" e "Logout invalida o token" continuam válidos qualquer que seja o modo de transporte.

### Estrutura em camadas (backend + UI)

**Decisão:** Organizar por **capability** (bounded context), espelhando as capabilities do OpenSpec.

```
src/
  middleware.ts                  # onboarding gate + auth gate para (app)
  app/
    (auth)/login/…               # UI de auth
    (auth)/signup/…              # UI de cadastro
    (app)/onboarding/…           # tela obrigatória pós-cadastro
    (app)/foods/…                # UI de food-catalog
    (app)/meals/…                # UI de meal-logging
    (app)/dashboard/…            # UI de nutrition-dashboard
    (app)/goals/…                # UI de nutrition-goals
    (app)/assistant/…            # UI de ai-diet-assistant
    api/v1/
      auth/…/route.ts            # user-accounts
      profile/route.ts
      foods/route.ts
      foods/[id]/route.ts
      meals/route.ts
      meals/[id]/route.ts
      meals/[id]/items/route.ts
      goals/route.ts
      goals/override/route.ts
      dashboard/daily/route.ts
      dashboard/weekly/route.ts
      ai/diet-suggestions/route.ts
      ai/history/route.ts
  server/
    user-accounts/{service,repository,schemas}.ts
    food-catalog/…
    meal-logging/…
    nutrition-goals/…
    nutrition-dashboard/…
    ai-diet-assistant/{service,providers/deepseek,rate-limit,redact}.ts
    core/{auth,db,rate-limit,logger,config}.ts
  ui/                            # componentes compartilhados (shadcn)
prisma/
  schema.prisma
  migrations/
docker/
  Dockerfile.web                 # dev-only, imagem que roda `next dev`
docker-compose.yml               # postgres + web (dev-only)
```

**Rationale:** as capabilities do OpenSpec já são a fronteira do sistema; espelhar isso deixa óbvio qual pasta implementa qual `spec.md` e simplifica changes futuros.

### Modelo de dados

**Decisão:** Esquema relacional em Postgres, gerenciado por **Prisma Migrate**. Entidades principais (nomes de campos em `snake_case` via `@map` para casar com estilo SQL, mas o cliente TS os expõe como `camelCase`):

- `User(id, email @unique, password_hash, created_at, onboarding_completed_at nullable, …)` — `onboarding_completed_at` marca quando o usuário concluiu o onboarding inicial e é a fonte de verdade que o middleware usa para decidir se redireciona para `/onboarding`.
- `UserProfile(user_id @id, date_of_birth, biological_sex, height_cm, weight_kg, body_fat_percent nullable, activity_level, goal, updated_at)` — `body_fat_percent` é `Decimal(4, 2)` opcional, restrito por validação Zod ao intervalo 3,00–75,00; permanece `NULL` para usuários que não informam.
- `Session(session_token @id, user_id, expires_at)` — modelo padrão do Auth.js Prisma adapter.
- `Food(id, source enum('base','user'), owner_user_id nullable, name, base_unit enum('100g','100ml'), kcal, protein_g, carb_g, fat_g, fiber_g, sodium_mg, deleted_at)` com índice `UNIQUE(owner_user_id, name)` para alimentos personalizados e índice funcional `LOWER(unaccent(name))` para busca sem acento (aplicado por SQL bruto na migração, já que Prisma não modela `unaccent` diretamente).
- `Meal(id, user_id, meal_date, meal_time nullable, meal_type, totals_kcal, totals_protein_g, totals_carb_g, totals_fat_g, totals_fiber_g, totals_sodium_mg, created_at)` — **totais materializados**.
- `MealItem(id, meal_id, food_id, food_name_snapshot, portion_amount, portion_unit, kcal_snapshot, protein_g_snapshot, carb_g_snapshot, fat_g_snapshot, fiber_g_snapshot, sodium_mg_snapshot)` — snapshot dos valores por-100 do alimento no momento do registro.
- `NutritionGoalOverride(user_id @id, kcal, protein_g, carb_g, fat_g, updated_at)` — se a linha não existe, metas são calculadas do perfil.
- `AiInteraction(id, user_id, created_at, intent, redacted_context Json, response, provider, tokens_prompt, tokens_completion, status, error_message)` — auditoria completa.
- `RateLimitHit(user_id, scope, hit_at)` — sliding window para o rate limit por usuário.

**Rationale:**
- Snapshots em `MealItem` + totais materializados em `Meal` são a maneira mais simples e correta de garantir o requisito de snapshot imutável do spec `meal-logging`. Um recomputar via `JOIN Food` violaria o spec no dia em que o usuário edita o alimento.
- `Food.source` unifica o catálogo base e o catálogo pessoal em uma única tabela pesquisável — a visibilidade fica em uma cláusula única (`source = 'base' OR owner_user_id = :user_id`).
- Override em uma tabela separada é mais claro que colunas nullable em `UserProfile` e permite história futura sem migração destrutiva.
- Auditoria em `AiInteraction` com `redacted_context Json` cumpre o spec `ai-diet-assistant` sem inflar cada tabela de domínio.

**Trade-off da Vercel Postgres:** o pooler serverless (URL padrão) cobra por sessão curta — cada Route Handler abre a conexão via `@vercel/postgres`. Isso é adequado para pico de requisições concorrentes típico de um MVP e é a razão de o Prisma ser configurado com o driver `@prisma/adapter-neon` ou `@vercel/postgres` (não usaremos o driver TCP direto do Prisma em produção).

### Cliente Prisma e conexão em serverless

**Decisão:** Em **produção Vercel**, `PrismaClient` é instanciado com o driver adapter `@prisma/adapter-neon` apontado para a URL do pooler (`POSTGRES_URL`). Migrações usam **`POSTGRES_URL_NON_POOLING`** (conexão direta, sem PgBouncer). Em **dev local**, o Prisma usa `DATABASE_URL` apontando para o Postgres do `docker-compose`.

Uma única instância de `PrismaClient` é reusada por invocação (padrão `global.prisma` em desenvolvimento; instância nova por cold start em produção). O `PrismaClient` é criado em `src/server/core/db.ts` e importado onde for necessário.

### Autorização e isolamento por usuário

**Decisão:** Toda Route Handler autenticada obtém `session` via `auth()` do Auth.js, extrai `session.user.id` e cada função de repositório **exige** `user_id = currentUserId` (ou `source = 'base'` para alimentos). Recursos de outros usuários retornam **404 "não encontrado"**, nunca 403, para não revelar existência (conforme cenário "Acesso a recurso de outro usuário").

### Fonte de dados nutricionais

**Decisão:** Popular o catálogo base a partir da **Tabela Brasileira de Composição de Alimentos (TACO / NEPA-UNICAMP)**, versão pública, importada por um script `scripts/seed-foods.ts` (executado com `tsx`). No dev roda via `docker compose exec web pnpm seed`; em produção Vercel, roda como um passo pontual através de `vercel env pull && pnpm seed:prod` (ou via workflow GitHub Actions apontando para o Postgres direto). O seed é **idempotente**: uma segunda execução não duplica alimentos base.

**Fallback documentado:** se algum item da TACO não tiver todos os 6 campos exigidos por `food-catalog` (kcal, proteínas, carboidratos, gorduras, fibras, sódio), o script rejeita a linha e escreve um relatório; nunca inserimos zero por preguiça, porque zerar sódio silenciosamente contamina o dashboard.

### Cálculo de metas

**Decisão:** Implementar a fórmula Mifflin–St Jeor, os fatores de atividade e os ajustes de objetivo dentro de `src/server/nutrition-goals/service.ts`, sem tabela de configuração — os valores são fixados no código do change conforme o spec, com testes unitários por caso. Split default 30/40/30 também no código.

### Integração com DeepSeek

**Decisão:** Um único módulo `src/server/ai-diet-assistant/providers/deepseek.ts` implementa uma interface `AIDietProvider` usando `fetch` global do Node.js contra `https://api.deepseek.com/chat/completions` (modelo `deepseek-chat`). A chave é lida de `process.env.DEEPSEEK_API_KEY` validada por Zod no boot; se ausente, o endpoint retorna erro de configuração conforme o spec, mas o restante da app permanece funcional.

Estrutura do prompt:
- **System message** (fixa, em pt-BR): descreve o papel do assistente, o formato pedido e inclui o **disclaimer** obrigatório do spec.
- **User message**: JSON estruturado contendo `active_targets`, `consumed_today`, `goal` e o `intent` do usuário. **Nunca** inclui e-mail, senha, token ou dados de outros usuários. Uma função `buildRedactedContext()` monta o JSON e é o que fica gravado em `ai_interactions.redacted_context`.
- **Parâmetros:** `max_tokens = 800`, `temperature = 0.4`. **Timeout de 25 s** com `AbortController` (margem sob o limite de 60 s do Vercel Pro; assumimos plano **Pro** por causa disso — ver Open Questions). Retry manual (1 tentativa extra) em erros 5xx/timeout.

**Rate limiting:** função `rateLimit({ userId, scope: 'ai_diet_suggestion', limit: 20, window: '1h' })` implementada com **sliding window em Postgres** (tabela `RateLimitHit`) — simples, correto após cold start, evita dependência a mais.

**Alternativa considerada:** **Upstash Redis** (integração Vercel first-party) daria contadores mais baratos que Postgres para rate limit — porém adiciona um provider a mais e não é necessário no MVP; documentamos como próximo passo se o custo ou a latência do rate limit em Postgres se mostrarem problema.

**Rationale para a interface:** deixa a porta aberta para um provider `mock` em testes (evita chamada real e custo em CI) e para um segundo provider (OpenAI, Anthropic) sem tocar em `meal-logging` / `nutrition-dashboard`.

### Contratos de API (visão macro)

Todos os endpoints ficam sob `/api/v1` como **Route Handlers Next.js** e retornam JSON. Prefixos por capability:

- `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/session-token`
- `GET /api/v1/profile`, `PUT /api/v1/profile`
- `GET /api/v1/foods?search=&page=`, `POST /api/v1/foods`, `GET|PUT|DELETE /api/v1/foods/[id]`
- `GET /api/v1/meals?date=YYYY-MM-DD`, `POST /api/v1/meals`, `GET|PUT|DELETE /api/v1/meals/[id]`, `POST /api/v1/meals/[id]/items`, `PUT|DELETE /api/v1/meals/[id]/items/[itemId]`
- `GET /api/v1/goals`, `PUT /api/v1/goals/override`, `DELETE /api/v1/goals/override`
- `GET /api/v1/dashboard/daily?date=`, `GET /api/v1/dashboard/weekly?iso_week=YYYY-Www`
- `POST /api/v1/ai/diet-suggestions`, `GET /api/v1/ai/history`

Cada rota mapeia diretamente para um ou mais scenarios do spec correspondente. Esta lista **não é** o spec — se conflitar com um `spec.md`, o `spec.md` prevalece.

### Frontend

**Decisão:** UI construída sobre o próprio Next.js — **Server Components** para telas majoritariamente de leitura (dashboard, listas), **Client Components** para formulários e interações. Estado de servidor no cliente com **TanStack Query**; formulários com **React Hook Form + Zod** (mesmos schemas usados no server-side). Cliente HTTP em `src/lib/api-client.ts` que injeta o cookie de sessão automaticamente (por ser same-origin) e trata 401 limpando a sessão local e redirecionando para `/login`.

**Fluxo de onboarding pós-cadastro:** existe uma rota dedicada `/(app)/onboarding/page.tsx` (Client Component com React Hook Form + Zod) que é a **primeira tela autenticada** apresentada a um usuário recém-cadastrado. Ela coleta, num único formulário, data de nascimento, sexo biológico, altura, peso atual, nível de atividade, objetivo e o percentual de gordura corporal (opcional). Ao submeter, o formulário chama `PUT /api/v1/profile`; o handler, ao aceitar o payload, também grava `users.onboarding_completed_at = now()` na mesma transação e redireciona o cliente para `/dashboard`.

O **gate** que impede acesso ao restante do app antes do onboarding é implementado em um `middleware.ts` na raiz que, para toda rota do grupo `(app)`, checa a sessão via Auth.js e, se `session.user.onboardingCompletedAt` é nulo, redireciona para `/onboarding`. Rotas de API do grupo `(app)` (todas menos `/api/v1/auth/*` e `/api/v1/profile`) fazem a mesma checagem no `requireUser()` e respondem 409 `onboarding_required` para clientes de API não-browser; o cliente HTTP do frontend trata esse status redirecionando o usuário para `/onboarding`. O onboarding só roda uma única vez por usuário — logins subsequentes com `onboarding_completed_at` já preenchido ignoram o gate e a rota `/onboarding` passa a servir apenas como página de edição do perfil já existente.

### Dev local com Docker Compose

**Decisão:** `docker-compose.yml` na raiz com dois serviços:

```
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB }
    ports: ["5432:5432"]
    volumes: [ pgdata:/var/lib/postgresql/data, ./scripts/pg-init:/docker-entrypoint-initdb.d ]
  web:
    build: { context: ., dockerfile: docker/Dockerfile.web }
    depends_on: [db]
    environment: { DATABASE_URL, DEEPSEEK_API_KEY, AUTH_SECRET }
    ports: ["3000:3000"]
    volumes: [ .:/app, /app/node_modules ]
    command: ["pnpm", "dev"]
```

O `pg-init` habilita `unaccent`. O `Dockerfile.web` é um Node 20 slim com `pnpm` e serve **apenas para dev**. A imagem de produção NÃO é usada — a Vercel builda a partir do repo Git direto.

**Ecommand único de setup local:** `docker compose up --build`, seguido de `docker compose exec web pnpm db:migrate && docker compose exec web pnpm seed`. Documentado no `README.md`.

### Deploy na Vercel

**Decisão:**
- Um único projeto Vercel apontado para o repositório Git. Framework detectado: Next.js.
- **Vercel Postgres** provisionado no dashboard (integração built-in); a Vercel injeta as env vars `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL` etc. automaticamente.
- Variáveis definidas manualmente no dashboard Vercel (Production e Preview): `DEEPSEEK_API_KEY`, `AUTH_SECRET`, `AUTH_URL`, `AI_RATE_LIMIT_PER_HOUR=20`.
- `package.json` define:
  - `"build": "prisma generate && next build"`
  - `"postinstall": "prisma generate"`
  - `"vercel-build": "prisma migrate deploy && prisma generate && next build"` — assim **cada deploy aplica as migrações antes do build** contra `POSTGRES_URL_NON_POOLING`.
- Preview Deployments (por PR) usam o mesmo banco Production — trade-off aceito no MVP (documentar). Alternativa registrada em Risks.
- Assumimos plano **Vercel Pro** por causa do limite de 60 s por invocação (o timeout do DeepSeek é de 25 s + margem). No plano Hobby (10 s), o endpoint de IA pode estourar em prompts longos.

## Risks / Trade-offs

- **[Custo variável da API do DeepSeek]** → Mitigação: rate limit de 20/h por usuário, `max_tokens = 800`, persistência do custo estimado em `AiInteraction` para monitorar por usuário; alerta operacional a partir de um teto configurável.
- **[Provider externo indisponível]** → Mitigação: 1 retry em 5xx/timeout; após falhar, o sistema devolve 502 amigável e persiste a falha em `AiInteraction.status='error'`; o restante da app segue funcionando.
- **[Limite de duração das Vercel Functions]** → Mitigação: fixamos timeout do DeepSeek em 25 s (compatível com Pro 60 s). Se um dia migrarmos para Hobby, o endpoint de IA precisa ser reescrito para streaming — registrado como débito.
- **[Cold start das Vercel Functions com Prisma]** → Mitigação: `@prisma/adapter-neon` reduz o cold start comparado ao driver TCP puro do Prisma; monitorar p95 do endpoint de IA e das leituras do dashboard; se sofrer, migrar rotas de leitura simples para Edge Runtime + `@vercel/postgres` (não usa Prisma).
- **[Preview Deployments compartilham banco de produção]** → Mitigação: cada preview roda migrações de produção (que devem ser sempre backward-compatible por política do change); alternativa é criar um projeto Neon separado para previews — deixado para um change futuro.
- **[Rate limit em Postgres não escala horizontalmente sem cuidado]** → Mitigação: aceitável no MVP; documentar como débito técnico a migração para Upstash Redis quando o volume exigir.
- **[Snapshot imutável cresce muito]** → Mitigação: colunas de snapshot são numéricas simples e ocupam pouco espaço por linha; custo aceitável.
- **[Precisão do cálculo de macros]** → Mitigação: `Decimal(10,2)` no Postgres (`@db.Decimal(10, 2)` no Prisma) para valores nutricionais; arredondamento apenas na resposta da API (uma casa em kcal, duas em gramas); testes de unidade em cenários canônicos.
- **[Sugestões da IA podem ser inadequadas]** → Mitigação: disclaimer obrigatório no retorno (spec), instruções firmes na system message, `temperature=0.4`, e a UI deixa claro que é sugestão — não prescrição.
- **[Dados sensíveis enviados a um provider externo]** → Mitigação: `buildRedactedContext()` envia só metas, consumido do dia e objetivo; termos de uso apresentados no cadastro incluem consentimento explícito ao processamento por LLM externo.
- **[Segredos vazando por Server Actions/Route Handlers para o cliente]** → Mitigação: `DEEPSEEK_API_KEY` **não** tem prefixo `NEXT_PUBLIC_`, o que garante que o bundler nunca o inclui no bundle do browser; testes automatizados verificam que `.next/static` não contém a chave.

## Migration Plan

Projeto **greenfield**, portanto não há migração de dados legados. O que existe é um **procedimento de bootstrap** em duas trilhas paralelas:

### Trilha de dev local (Docker Compose)

1. Criar o repositório com a estrutura descrita em "Estrutura em camadas".
2. `cp .env.example .env.local` e preencher `AUTH_SECRET`, `DEEPSEEK_API_KEY` (para testar IA de fato) e deixar `DATABASE_URL=postgres://postgres:postgres@localhost:5432/nutri`.
3. `docker compose up --build` sobe `db` e `web`.
4. `docker compose exec web pnpm db:migrate` (equivalente a `prisma migrate deploy`).
5. `docker compose exec web pnpm seed` popula o catálogo TACO.
6. Aplicação disponível em `http://localhost:3000`.

### Trilha de deploy Vercel

1. Criar o projeto Vercel a partir do repositório.
2. Adicionar a integração **Vercel Postgres** — Vercel provisiona o banco e injeta as env vars.
3. Adicionar Environment Variables `DEEPSEEK_API_KEY`, `AUTH_SECRET`, `AUTH_URL` (Production e Preview).
4. Fazer o primeiro deploy: o `vercel-build` roda `prisma migrate deploy` contra o banco e depois o `next build`.
5. Rodar o seed do catálogo TACO uma única vez: `pnpm dlx vercel env pull .env.production.local && pnpm seed` (script conectando com `POSTGRES_URL_NON_POOLING`).
6. Confirmar acesso a `https://<app>.vercel.app`, com `/api/v1/health` respondendo 200.

**Rollback:**
- **Aplicação:** promover o deploy anterior via dashboard Vercel (built-in).
- **Banco:** migrações Prisma devem ser sempre aditivas dentro deste change; caso uma se prove destrutiva, gerar uma migração reversa como parte de um change futuro. Não usamos `prisma migrate reset` em produção.

## Open Questions

- **Plano Vercel: Hobby ou Pro?** Assumimos **Pro** por causa do limite de 60 s por função (crítico para o endpoint de IA com timeout de 25 s + overhead). Se o dono do produto quiser começar em Hobby, o endpoint de IA precisa ser reescrito em streaming ou ter timeout reduzido para ~7 s. Não altera specs.
- **Modelo default do DeepSeek:** `deepseek-chat` ou `deepseek-reasoner`? Escolha inicial: `deepseek-chat` (barato, rápido). Trocar é um change trivial em `providers/deepseek.ts` sem tocar nenhum `spec.md`.
- **Versão da TACO** (edição 4, edição 2011, ou releitura mais recente): decidir na execução do seed — não altera specs.
- **Banco de Preview separado:** aceitável começar com Preview compartilhando o banco de produção, ou provisionar um segundo banco Neon exclusivo para previews desde o dia 1? Decisão inicial: compartilhado; formalizar em change futuro se se provar arriscado.
