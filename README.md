# nutritional

Sistema de acompanhamento nutricional com um assistente de IA (integrado à API do DeepSeek) que sugere dietas personalizadas a partir do perfil, das metas e do consumo do usuário.

Status atual do repositório: **apenas planejamento**. Nenhum código de aplicação foi escrito ainda. Toda a especificação está descrita em [OpenSpec](https://github.com/Fission-AI/OpenSpec) sob [`openspec/`](openspec/).

## Como este projeto está sendo planejado

Estamos usando o [OpenSpec](https://github.com/Fission-AI/OpenSpec) para separar **planejamento** (spec-driven) de **implementação**. Cada mudança começa como um "change" com quatro artefatos:

- `proposal.md` — o **porquê** e o **o que**.
- `specs/**/spec.md` — o **comportamento observável** por capacidade (contrato testável, um arquivo por capacidade).
- `design.md` — as **decisões técnicas** e trade-offs (o **como**).
- `tasks.md` — o **checklist** de implementação, com verificação em cada tarefa.

O change inicial deste produto é [`bootstrap-nutrition-tracker`](openspec/changes/bootstrap-nutrition-tracker/) e ele bootstrapa o produto inteiro. As capacidades definidas nele são:

| Capacidade | O que faz |
|---|---|
| [`user-accounts`](openspec/changes/bootstrap-nutrition-tracker/specs/user-accounts/spec.md) | Cadastro, autenticação por e-mail e senha, perfil nutricional (peso, altura, atividade, objetivo). |
| [`food-catalog`](openspec/changes/bootstrap-nutrition-tracker/specs/food-catalog/spec.md) | Catálogo pesquisável de alimentos (base TACO + alimentos personalizados por usuário). |
| [`meal-logging`](openspec/changes/bootstrap-nutrition-tracker/specs/meal-logging/spec.md) | Registro de refeições com snapshot nutricional imutável. |
| [`nutrition-goals`](openspec/changes/bootstrap-nutrition-tracker/specs/nutrition-goals/spec.md) | Metas diárias (Mifflin–St Jeor + fator de atividade + objetivo), com override manual. |
| [`nutrition-dashboard`](openspec/changes/bootstrap-nutrition-tracker/specs/nutrition-dashboard/spec.md) | Resumo diário e semanal do consumido vs. metas. |
| [`ai-diet-assistant`](openspec/changes/bootstrap-nutrition-tracker/specs/ai-diet-assistant/spec.md) | Assistente de IA integrado ao DeepSeek, com rate limit por usuário, auditoria de interações e disclaimer obrigatório. |

## Stack alvo (definida no `design.md`)

- **App**: Next.js 15 (App Router) + TypeScript, com API como Route Handlers.
- **ORM**: Prisma 5.
- **Banco (prod)**: Vercel Postgres (Neon) via pooler serverless.
- **Auth**: Auth.js v5 (Credentials + Prisma adapter) com Argon2id (`@node-rs/argon2`).
- **UI**: Tailwind CSS + shadcn/ui.
- **Provider de IA**: DeepSeek (`deepseek-chat`) chamado por `fetch` server-side.
- **Deploy**: Vercel (plano Pro assumido por causa do limite de 60 s por invocação).
- **Dev local**: Docker Compose com Postgres 16 + o app Next.js.

## Trabalhando com o OpenSpec

Requer o CLI do OpenSpec: `npm install -g @fission-ai/openspec` (ou usar `npx`).

```bash
# Ver todos os changes ativos
openspec list

# Ver o status do change de bootstrap
openspec status --change bootstrap-nutrition-tracker

# Validar o change
openspec validate bootstrap-nutrition-tracker --strict

# Ver os artefatos
openspec show --change bootstrap-nutrition-tracker
```

Também há skills e comandos configurados para o Cursor em `.cursor/skills/` e `.cursor/commands/`; dentro do Cursor os comandos aparecem como `/opsx-propose`, `/opsx-apply`, `/opsx-explore`, etc.

## Próximos passos

1. Revisar `openspec/changes/bootstrap-nutrition-tracker/proposal.md`, `design.md` e `tasks.md`.
2. Ajustar premissas se necessário (plano Vercel, banco de preview separado, modelo DeepSeek, versão da TACO — todas essas estão como *Open Questions* no `design.md`).
3. Aplicar o change (implementar): rodar `/opsx-apply bootstrap-nutrition-tracker` no Cursor ou pedir ao agente para aplicar.
4. Ao final da implementação: `openspec archive bootstrap-nutrition-tracker` move as specs deste change para `openspec/specs/` e ele deixa de ser um "active change".

## Licença

MIT (a ser adicionada quando a implementação começar).
