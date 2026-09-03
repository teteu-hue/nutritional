## Why

Não existe hoje neste projeto (greenfield) nenhum sistema para que usuários registrem sua alimentação, acompanhem metas nutricionais e recebam orientações personalizadas de dieta. Um sistema de acompanhamento nutricional com um assistente de IA (via API DeepSeek) permite que o usuário: (1) entenda o que come em termos de calorias e macronutrientes, (2) acompanhe o progresso em relação a metas diárias e (3) receba sugestões de dieta contextualizadas, reduzindo a barreira de contratar um nutricionista ou de aprender manualmente a montar um plano alimentar. Iniciar essa base agora define o alicerce sobre o qual funcionalidades futuras (planos avançados, integração com wearables, comunidade, etc.) serão construídas.

## What Changes

- Novo produto: aplicação web para acompanhamento nutricional pessoal, composta por um backend com API REST e um frontend SPA.
- Autenticação de usuários com cadastro (e-mail + senha), login e perfil (idade, sexo, altura, peso, percentual de gordura corporal — opcional — nível de atividade e objetivo — perder peso, manter, ganhar).
- Tela inicial de **onboarding** obrigatória logo após o cadastro, que coleta os dados do perfil (altura, peso atual, percentual de gordura opcional, data de nascimento, sexo biológico, nível de atividade e objetivo) antes de liberar acesso a qualquer outra área autenticada da aplicação.
- Catálogo de alimentos com informações nutricionais (calorias, proteínas, carboidratos, gorduras, fibras, sódio) e busca por nome; permite ao usuário cadastrar alimentos personalizados.
- Registro de refeições (café da manhã, almoço, jantar, lanches) com data, hora, alimento e porção; cálculo automático dos macros consumidos.
- Metas nutricionais diárias calculadas a partir do perfil (BMR via Mifflin–St Jeor + fator de atividade + ajuste pelo objetivo) com opção de sobrescrita manual pelo usuário.
- Painel nutricional com resumo diário e semanal do consumo vs. metas (kcal e macros).
- Assistente de IA de dieta integrado à API do DeepSeek: recebe o contexto do usuário (perfil, metas e últimos registros) e retorna sugestões de dieta em linguagem natural (ex.: "sugerir o que comer no jantar dado o restante de kcal do dia", "planejar 1 dia de refeições dentro da meta"). Chamadas do assistente são registradas para auditoria.
- Configuração segura da chave `DEEPSEEK_API_KEY` via variável de ambiente e política de rate-limit por usuário para conter custos.

### Premissas (registradas explicitamente)

- Plataforma inicial: aplicação **web** unificada. Mobile nativo fica fora do escopo do MVP.
- **Alvo de deploy de produção: Vercel** — a aplicação é entregue como um único projeto Vercel, o que empurra a stack para ser *Vercel-native*.
- **Banco de dados de produção: Vercel Postgres** (serverless Postgres provido pela Vercel, hoje ancorado em Neon) — não haverá Postgres auto-hospedado em produção; todo acesso passa por um pooler serverless.
- **Docker é usado apenas para desenvolvimento local**, para simplificar o setup ("clonou, `docker compose up`, e a aplicação sobe com um Postgres local pronto"); ele NÃO é o mecanismo de deploy em produção.
- Idioma padrão da interface e das respostas do assistente: **português (Brasil)**.
- Uso **individual/pessoal** (single-tenant do ponto de vista de dados: cada usuário só vê os próprios registros); sem funcionalidades sociais neste change.
- Dados nutricionais base virão de uma fonte pública/aberta (ex.: tabela TACO ou USDA FoodData Central), importada durante o setup — sem contrato comercial neste change.
- Sem pagamentos, plano pago ou billing neste change.
- Sem integração com wearables, códigos de barras ou reconhecimento de imagem neste change.
- O assistente de IA fornece **sugestões**, não prescrição clínica; interface exibirá disclaimer.
- Escolhas de stack concretas (framework web, ORM, biblioteca de autenticação, cliente do provider) são fechadas no `design.md` sob a restrição "roda em Vercel Functions em runtime Node.js e usa Vercel Postgres via pooler serverless".

## Capabilities

### New Capabilities
- `user-accounts`: cadastro, autenticação, sessão, onboarding pós-cadastro e perfil nutricional do usuário (dados antropométricos, percentual de gordura corporal opcional, nível de atividade, objetivo).
- `food-catalog`: catálogo pesquisável de alimentos com valores nutricionais por 100 g/ml e suporte a alimentos personalizados por usuário.
- `meal-logging`: registro de refeições e porções consumidas ao longo do dia, com cálculo dos totais nutricionais.
- `nutrition-goals`: cálculo e gestão das metas diárias de calorias e macronutrientes derivadas do perfil, com override manual.
- `nutrition-dashboard`: visualização do consumo diário e semanal comparado às metas do usuário.
- `ai-diet-assistant`: integração com a API do DeepSeek para gerar sugestões de dieta contextualizadas ao perfil e ao histórico do usuário, com controle de custo e auditoria.

### Modified Capabilities
<!-- Nenhuma. Este é o change de bootstrap: não há specs anteriores para modificar. -->

## Impact

- **Código**: cria a base de repositório do produto como uma **aplicação Next.js única** (App Router) que serve tanto a UI quanto os Route Handlers da API, mais migrações de banco (Prisma) e um seed do catálogo de alimentos.
- **APIs internas**: novos endpoints REST em `/api/v1/auth/*`, `/api/v1/profile`, `/api/v1/foods`, `/api/v1/meals`, `/api/v1/goals`, `/api/v1/dashboard` e `/api/v1/ai/diet-suggestions`, implementados como Route Handlers Next.js em runtime Node.js.
- **API externa**: chamadas HTTP à API do DeepSeek (`https://api.deepseek.com/...`) autenticadas por token; nova dependência operacional externa (SLA e custo por token).
- **Dependências principais**: `next`, `react`, `typescript`, `prisma` + `@prisma/client`, `@vercel/postgres` (driver serverless), `next-auth` (v5, Auth.js) com adapter Prisma, `@node-rs/argon2` para hash de senha, `zod` para validação, `tailwindcss` + `shadcn/ui` para UI. Versões finais no `design.md`.
- **Infraestrutura de produção (Vercel)**: um projeto Vercel, um banco Vercel Postgres provisionado, variáveis de ambiente da aplicação e chave `DEEPSEEK_API_KEY` armazenadas em Environment Variables do Vercel, e um `vercel-build` que aplica migrações Prisma no deploy.
- **Infraestrutura de dev (Docker Compose)**: `docker-compose.yml` com um serviço `postgres:16` e (opcionalmente) um serviço `web` rodando `next dev`, para que o setup local seja "clonou → `docker compose up`".
- **Dados**: novo esquema relacional com tabelas para usuários, perfis, alimentos, refeições, itens de refeição, metas, interações da IA e sessões, gerenciado por `prisma migrate`.
- **Segurança/Compliance**: passa a armazenar dados pessoais sensíveis (peso, medidas, hábitos alimentares) — impacto LGPD; exige política de retenção, consentimento no cadastro e HTTPS (fornecido pela Vercel). Chave da DeepSeek nunca é exposta ao browser (só em Route Handlers server-side).
- **Operação**: novas variáveis de ambiente obrigatórias (`DATABASE_URL` e `POSTGRES_URL_NON_POOLING` do Vercel Postgres, `DEEPSEEK_API_KEY`, `AUTH_SECRET`), rate-limit por usuário no endpoint de IA (persistido em Postgres) e logging estruturado das chamadas ao provider.
- **Documentação**: novo `README` com passos "dev com Docker Compose" **e** "deploy no Vercel", e um `docs/deepseek-integration.md` operacional (custo, rotação de chave, limites da Vercel).
