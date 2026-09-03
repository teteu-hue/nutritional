# Roteiro E2E manual

1. Acesse `/signup` e crie conta com e-mail único e senha ≥8 chars.
2. Confirme redirect para `/onboarding`.
3. Preencha perfil (altura, peso, atividade, objetivo) e salve → `/dashboard`.
4. Em `/foods`, busque "arroz" — deve listar alimentos do catálogo base.
5. Copie ID de um alimento e em `/meals` registre refeição com porção 150g.
6. Volte ao `/dashboard` — calorias consumidas devem aumentar.
7. Em `/goals`, aplique override manual válido e verifique badge "manual".
8. Em `/assistant`, envie intent (requer `DEEPSEEK_API_KEY`) ou verifique erro 503 sem chave.
9. Faça logout via `POST /api/v1/auth/logout` — sessão subsequentes retornam 401.

Resultado esperado em cada passo: resposta HTTP 2xx e UI refletindo o estado descrito.
