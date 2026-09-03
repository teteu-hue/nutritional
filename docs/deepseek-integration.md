# Integração DeepSeek

## Endpoint interno

`POST /api/v1/ai/diet-suggestions` — body: `{ "intent": "..." }`

## Payload enviado ao provider

JSON com:

- `activeTargets` — metas diárias (kcal, macros)
- `consumedToday` — consumo do dia
- `goal` — objetivo do usuário
- `intent` — pedido em linguagem natural

**Nunca enviado:** e-mail, senha, token de sessão, dados de outros usuários.

## Configuração

- Variável: `DEEPSEEK_API_KEY` (server-side only, sem prefixo `NEXT_PUBLIC_`)
- Modelo: `deepseek-chat`
- `max_tokens`: 800
- `temperature`: 0.4
- Timeout: 25s com 1 retry em 5xx

## Rate limit

- 20 requisições/hora/usuário (`AI_RATE_LIMIT_PER_HOUR`)
- Persistido em `rate_limit_hits`

## Disclaimer

Toda resposta inclui disclaimer informando que a sugestão não substitui acompanhamento profissional.

## Rotação de chave

```bash
vercel env rm DEEPSEEK_API_KEY production
vercel env add DEEPSEEK_API_KEY production
```

## Custo estimado

Depende do tamanho do prompt (~200–400 tokens) + resposta (até 800 tokens). Monitore via `ai_interactions.tokens_prompt` e `tokens_completion`.
