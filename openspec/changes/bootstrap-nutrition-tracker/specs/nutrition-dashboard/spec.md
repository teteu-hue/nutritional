## Purpose

Apresentar ao usuário o consumo nutricional agregado do dia e da semana, comparado às suas metas ativas, para que ele veja em uma só tela o quanto já ingeriu e o quanto ainda pode ingerir de energia e macros.

## ADDED Requirements

### Requirement: Resumo diário
The system SHALL provide, for the authenticated user and a given date, a daily summary containing the total energia (kcal), proteínas (g), carboidratos (g), gorduras (g), fibras (g) e sódio (mg) consumed on that date, the active daily targets for energia, proteínas, carboidratos and gorduras, and the remaining amount for each of those four targets computed as target minus consumed.

#### Scenario: Dia com refeições registradas
- **WHEN** um usuário autenticado consulta o resumo de uma data com uma ou mais refeições registradas
- **THEN** o sistema retorna consumidos, metas e restantes de energia, proteínas, carboidratos e gorduras, incluindo também os consumos totais de fibras e sódio

#### Scenario: Dia sem refeições registradas
- **WHEN** o usuário consulta o resumo de uma data sem refeições registradas
- **THEN** o sistema retorna zero em todos os consumidos e "restante = meta" para os quatro alvos, sem erro

#### Scenario: Perfil incompleto ainda sem metas
- **WHEN** o usuário consulta o resumo enquanto ainda não há metas ativas (perfil incompleto e sem override)
- **THEN** o sistema retorna os consumidos e indica que os alvos e restantes estão indisponíveis, orientando a completar o perfil

### Requirement: Resumo semanal
The system SHALL provide, for the authenticated user and a given ISO week, an aggregated summary with the per-day consumo of energia, proteínas, carboidratos e gorduras for the seven days of that week, together with the average daily consumo across the days that have registered meals.

#### Scenario: Semana parcialmente preenchida
- **WHEN** o usuário consulta o resumo de uma semana em que apenas alguns dias têm refeições registradas
- **THEN** o sistema retorna zero para os dias vazios, os consumos reais para os dias preenchidos, e a média considera apenas dias com refeições

#### Scenario: Ordenação dos dias
- **WHEN** o resumo semanal é retornado
- **THEN** os dias aparecem em ordem cronológica, do primeiro dia da semana ISO até o sétimo

### Requirement: Isolamento por usuário no dashboard
The system SHALL ensure that daily and weekly summaries reflect only the meals owned by the authenticated user.

#### Scenario: Dados de outros usuários não aparecem
- **WHEN** dois usuários consultam o resumo da mesma data
- **THEN** cada um recebe totais calculados apenas a partir das próprias refeições
